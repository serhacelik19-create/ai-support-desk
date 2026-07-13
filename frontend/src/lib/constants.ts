// Centralized application constants

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5002";

export const TONE_OPTIONS = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "empathetic", label: "Empathetic" },
  { value: "persuasive", label: "Persuasive" },
] as const;

export const QUICK_TEMPLATES = [
  { label: "👋 Greet", text: "Hello {name}, thank you for reaching out! How can I help you today?" },
  { label: "⏳ Investigate", text: "I am looking into this issue right now and will get back to you with an update shortly." },
  { label: "❓ Ask Order", text: "Could you please provide your order number or registered account email?" },
  { label: "✅ Solved", text: "The issue has been resolved successfully. Please let me know if there is anything else I can do!" },
] as const;
