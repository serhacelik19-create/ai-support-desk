"use client";

import React from "react";
import { Send, Info } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  isResolved: boolean;
  customerName: string;
}

export default function ChatInput({ value, onChange, onSend, isResolved, customerName }: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="chat-input-container">
      {isResolved && (
        <div className="resolved-notice">
          <Info className="w-4 h-4" />
          This ticket has been marked as resolved.
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="chat-input-row"
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Write message to ${customerName}...`}
          className="chat-textarea"
        />
        <button type="submit" disabled={!value.trim()} className="chat-send-btn">
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
}
