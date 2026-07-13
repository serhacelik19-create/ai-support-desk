import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const SETTINGS_FILE_PATH = path.join(__dirname, "../../settings.json");

export interface SystemSettings {
  // AI Settings
  geminiApiKey: string;
  geminiModel: string;
  defaultTone: string;
  systemInstruction: string;

  // Simulator Settings
  simulatorEnabled: boolean;
  simulatorInterval: number;
  channels: string[];

  // Routing & SLA
  autoAssignment: boolean;
  routingAlgorithm: string;
  slaTargetMinutes: number;

  // Agent Settings
  agentName: string;
  agentEmail: string;
  agentRole: string;
  agentSignature: string;
}

const DEFAULT_INSTRUCTION = `You are a professional AI Customer Support Assistant helping a human support agent.
Your task is to generate a high-quality, natural DRAFT REPLY that the agent can review and send.

## CRITICAL RULES
1. **LANGUAGE**: Detect the language of the customer's LAST message and write the draft reply absolutely in the SAME language. If the customer wrote in Turkish, reply in Turkish. If they wrote in English, reply in English. Language matching is extremely critical.
2. **FORMAT**: Write only plain text. Do NOT use markdown bold, lists, headings, or any other formatting. Do NOT output any structural labels, bullet points, meta-headers, or section headers (e.g., do NOT write "Greeting:", "Draft Reply:", or "Refining constraints"). Write only a single natural, continuous conversational paragraph.
3. **LENGTH**: 1-2 complete sentences. Keep it extremely concise, brief, and directly focused.
4. **CONTENT**: Directly address the customer's last question/request. Do NOT make up any false information. For complex issues, state that you are looking into it.
5. **PERSONALIZATION**: Address the customer by their name: {customerName}
6. **COMPLETENESS**: The response MUST be grammatically complete and end with proper punctuation (such as a period, exclamation mark, or question mark). Never end abruptly or cut off in the middle.`;

const defaultSettings: SystemSettings = {
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
  defaultTone: "friendly",
  systemInstruction: DEFAULT_INSTRUCTION,
  simulatorEnabled: true,
  simulatorInterval: 40,
  channels: ["whatsapp", "web"],
  autoAssignment: true,
  routingAlgorithm: "round-robin",
  slaTargetMinutes: 15,
  agentName: "Support Agent",
  agentEmail: "agent@company.com",
  agentRole: "Senior Support Engineer",
  agentSignature: "Best regards,\nSupport Team",
};

let currentSettings: SystemSettings = { ...defaultSettings };

// Load settings on startup
export function loadSettings(): SystemSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const data = fs.readFileSync(SETTINGS_FILE_PATH, "utf-8");
      currentSettings = { ...defaultSettings, ...JSON.parse(data) };
      console.log("[SettingsService] Settings loaded successfully from settings.json.");
    } else {
      saveSettings(defaultSettings);
      console.log("[SettingsService] Created default settings.json file.");
    }
  } catch (error) {
    console.error("[SettingsService] Failed to load settings, using defaults:", error);
    currentSettings = { ...defaultSettings };
  }
  return currentSettings;
}

export function getSettings(): SystemSettings {
  return currentSettings;
}

export function saveSettings(newSettings: Partial<SystemSettings>): SystemSettings {
  currentSettings = { ...currentSettings, ...newSettings };
  try {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(currentSettings, null, 2), "utf-8");
    console.log("[SettingsService] Settings saved to settings.json.");
    
    // Apply runtime updates to services
    applyRuntimeSettings(currentSettings);
  } catch (error) {
    console.error("[SettingsService] Failed to save settings to file:", error);
  }
  return currentSettings;
}

// Side effects callback register
let onSettingsChangeCallback: ((settings: SystemSettings) => void) | null = null;

export function registerSettingsChangeListener(callback: (settings: SystemSettings) => void) {
  onSettingsChangeCallback = callback;
}

function applyRuntimeSettings(settings: SystemSettings) {
  if (onSettingsChangeCallback) {
    onSettingsChangeCallback(settings);
  }
}
