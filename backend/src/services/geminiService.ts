import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSettings } from "./settingsService";
import { PrismaClient } from "@prisma/client";
import { maskPII } from "../lib/masker";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

let lastApiKey = "";
let cachedGenAI: GoogleGenerativeAI | null = null;

function getGenAIClient(apiKey: string): GoogleGenerativeAI | null {
  if (!apiKey || apiKey.startsWith("YOUR_")) return null;
  if (cachedGenAI && apiKey === lastApiKey) {
    return cachedGenAI;
  }
  try {
    cachedGenAI = new GoogleGenerativeAI(apiKey);
    lastApiKey = apiKey;
    console.log("[GeminiService] Initialized GoogleGenerativeAI client with updated API key.");
    return cachedGenAI;
  } catch (error) {
    console.error("[GeminiService] Failed to initialize GoogleGenerativeAI client:", error);
    return null;
  }
}

/**
 * Tone-specific temperature mapping.
 * Lower = more focused/professional, Higher = more creative/warm.
 */
const TONE_TEMPERATURE: Record<string, number> = {
  professional: 0.4,
  empathetic: 0.65,
  friendly: 0.7,
  persuasive: 0.75,
};

/**
 * Generates an automated customer service reply draft based on conversation context.
 * Automatically detects the customer's language and responds accordingly.
 *
 * @param history Array of previous messages in the conversation
 * @param customerName Name of the customer for personalized drafts
 * @param tone Tone modifier ("professional", "empathetic", "friendly", "persuasive")
 */
export async function generateDraftReply(
  history: { sender: string; content: string }[],
  customerName: string,
  tone: string = "friendly"
): Promise<string> {
  const settings = getSettings();
  const genAI = getGenAIClient(settings.geminiApiKey);

  if (!genAI) {
    return `[AI Offline] Could not generate draft reply for customer ${customerName}. Please check your GEMINI_API_KEY setting.`;
  }

  try {
    // 1. Fetch Knowledge Base entries (RAG)
    const kbEntries = await prisma.knowledgeBase.findMany();
    const kbContext = kbEntries
      .map((entry) => `### Rule/Info: ${entry.title}\n${entry.content}`)
      .join("\n\n");

    const rawInstruction = settings.systemInstruction || "";
    let systemInstruction = rawInstruction.replace(/{customerName}/g, customerName);

    if (kbEntries.length > 0) {
      systemInstruction += `\n\n## COMPANY KNOWLEDGE BASE & RULES
Use the following official guidelines, FAQs, and company rules to answer the customer:
${kbContext}

You MUST follow these guidelines strictly when drafting the response.`;
    }

    const model = genAI.getGenerativeModel({
      model: settings.geminiModel || "gemini-3.1-flash-lite",
      systemInstruction: systemInstruction,
    });

    // 2. Build conversation context with data masking (KVKK)
    const conversationContext = history
      .map((msg) => {
        const content = msg.sender === "customer" ? maskPII(msg.content) : msg.content;
        return msg.sender === "customer"
          ? `[Customer - ${customerName}]: ${content}`
          : `[Support Agent]: ${content}`;
      })
      .join("\n");

    // Detect and mask the last customer message
    const lastCustomerMsg = [...history].reverse().find((m) => m.sender === "customer");
    const lastMsgContent = lastCustomerMsg ? maskPII(lastCustomerMsg.content) : "";

    const userPrompt = `You are replying to the customer named: ${customerName}
Write the reply in a "${tone}" tone.

## CONVERSATION HISTORY
${conversationContext}

## CUSTOMER'S LAST MESSAGE
"${lastMsgContent}"

Generate the draft reply now (start writing the response directly, with no intro or labels):`;

    const temperature = TONE_TEMPERATURE[tone] ?? 0.7;

    const apiCallPromise = model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 1024,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API call timed out (8s)")), 8000)
    );

    const result = await Promise.race([apiCallPromise, timeoutPromise]);

    const reply = result.response.text()?.trim() || "";
    console.log(`[GeminiService] Tone: ${tone} | Temp: ${temperature} | Output: "${reply}"`);

    // Clean up any stray quotes or markdown formatting
    return reply.replace(/^"|"$/g, "").replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
  } catch (error) {
    console.error("Error generating draft from Gemini API:", error);
    // Language-aware fallback: detect if last message was Turkish-like
    const lastMsg = [...history].reverse().find((m) => m.sender === "customer")?.content ?? "";
    const isTurkish = /[çğıöşüÇĞİÖŞÜ]/.test(lastMsg) || /\b(merhaba|selam|teşekkür|lütfen|yardım|sipariş|iade|iptal|hesap)\b/i.test(lastMsg);

    const prefix = "[Gemini Error] ";
    if (isTurkish) {
      return `${prefix}Merhaba ${customerName}, destek ekibimize ulaştığınız için teşekkür ederiz. Talebinizi aldık ve en kısa sürede size geri dönüş yapacağız. Başka bir konuda yardımcı olabilir miyiz?`;
    }
    return `${prefix}Hi ${customerName}, thank you for contacting support. I have received your request and am looking into this right away. How else can I assist you in the meantime?`;
  }
}
