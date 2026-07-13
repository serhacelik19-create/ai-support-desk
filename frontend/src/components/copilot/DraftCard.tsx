"use client";

import { useState } from "react";
import { RefreshCw, Zap, Copy, Check, Sparkles, AlertCircle } from "lucide-react";
import { Message } from "@/lib/types";
import { TONE_OPTIONS } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";

interface DraftCardProps {
  lastCustomerMessage: Message | null;
  isGenerating: boolean;
  onRedraft: (tone: string) => void;
  onApply: (draft: string) => void;
  onSendDirect: (content: string) => void;
}

export default function DraftCard({
  lastCustomerMessage,
  isGenerating,
  onRedraft,
  onApply,
  onSendDirect,
}: DraftCardProps) {
  const [selectedTone, setSelectedTone] = useState("friendly");
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const handleToneChange = (tone: string) => {
    setSelectedTone(tone);
    if (lastCustomerMessage && lastCustomerMessage.draftReply) {
      onRedraft(tone);
    }
  };

  const handleGenerateClick = () => {
    onRedraft(selectedTone);
  };

  const handleCopy = (draft: string) => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    addToast("Draft copied to clipboard", "info");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!lastCustomerMessage) {
    return (
      <div className="copilot-empty">
        <Sparkles className="w-8 h-8 copilot-empty-icon" />
        <span className="notranslate">Select an active chat to enable AI Copilot.</span>
      </div>
    );
  }

  const draftText = lastCustomerMessage.draftReply || "";
  const isOffline = draftText.startsWith("[AI Offline]");
  const isGeminiError = draftText.startsWith("[Gemini Error]");
  const hasError = isOffline || isGeminiError;

  const cleanDraftText = draftText
    .replace(/^\[AI Offline\]\s*/, "")
    .replace(/^\[Gemini Error\]\s*/, "");

  // Localized tone options map
  const localToneLabels: Record<string, string> = {
    friendly: "Friendly",
    professional: "Professional",
    empathetic: "Empathetic",
    persuasive: "Persuasive"
  };

  return (
    <div className={`copilot-card ${isGenerating ? "loading" : ""}`}>
      <div className="copilot-card-header">
        <span className="copilot-badge notranslate">AI Draft Reply</span>

        <div className="tone-selector-inline">
          <span className="tone-label">Tone:</span>
          <select
            value={selectedTone}
            onChange={(e) => handleToneChange(e.target.value)}
            className="tone-select"
          >
            {TONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {localToneLabels[opt.value] || opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasError && (
        <div className="copilot-error-banner">
          <AlertCircle className="w-4 h-4 error-banner-icon" />
          <div className="error-banner-content">
            <span className="error-banner-title">
              {isOffline ? "Gemini Service Offline" : "Gemini API Error"}
            </span>
            <span className="error-banner-desc">
              {isOffline 
                ? "API key is not configured or invalid. Offline response is shown." 
                : "Could not connect to Gemini API. System backup response is shown."}
            </span>
          </div>
        </div>
      )}

      {isGenerating ? (
        <div className="draft-box draft-loading">
          <RefreshCw className="w-4 h-4 animate-spin draft-spinner" />
          AI is generating draft reply...
        </div>
      ) : lastCustomerMessage.draftReply ? (
        <>
          <div className="draft-box">{cleanDraftText}</div>
          <div className="draft-actions">
            <button
              onClick={() => onApply(cleanDraftText)}
              className="btn-draft-apply"
              type="button"
            >
              <Zap className="w-4 h-4" />
              Apply to Input
            </button>
            <button
              onClick={() => onSendDirect(cleanDraftText)}
              className="btn-draft-send"
              type="button"
            >
              Send Directly
            </button>
            <button
              onClick={() => handleCopy(cleanDraftText)}
              className="btn-draft-copy"
              title="Copy"
              type="button"
            >
              {copied ? <Check className="w-4 h-4 copy-success" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </>
      ) : (
        <div className="draft-box draft-waiting" style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", padding: "20px 10px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "center" }}>
            No AI draft has been generated for this message yet (Cost Saving Enabled).
          </span>
          <button
            onClick={handleGenerateClick}
            className="btn-draft-apply"
            style={{ width: "auto", alignSelf: "center", display: "flex", gap: "8px", alignItems: "center" }}
            type="button"
          >
            <Sparkles className="w-4 h-4" />
            Generate AI Draft
          </button>
        </div>
      )}
    </div>
  );
}
