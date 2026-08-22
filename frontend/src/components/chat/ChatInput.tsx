"use client";

import React from "react";
import { Send, Info } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  isDisabled?: boolean;
  disabledNotice?: string | null;
  customerName: string;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  isDisabled = false,
  disabledNotice,
  customerName,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isDisabled && value.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="chat-input-container">
      {isDisabled && disabledNotice && (
        <div className="resolved-notice">
          <Info className="w-4 h-4" />
          {disabledNotice}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isDisabled && value.trim()) {
            onSend();
          }
        }}
        className="chat-input-row"
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isDisabled
              ? "Messaging is disabled for this ticket..."
              : `Write message to ${customerName}...`
          }
          className="chat-textarea"
          disabled={isDisabled}
        />
        <button
          type="submit"
          disabled={isDisabled || !value.trim()}
          className="chat-send-btn"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
}
