"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Conversation, Message } from "@/lib/types";
import DraftCard from "./DraftCard";

interface CopilotPanelProps {
  activeTicket: Conversation | null;
  conversations: Conversation[];
  isGenerating: boolean;
  onRedraft: (conversationId: string, lastMessageId: string, tone: string) => void;
  onApplyDraft: (draft: string) => void;
  onSendDirect: (conversationId: string, content: string) => void;
}

export default function CopilotPanel({
  activeTicket,
  conversations,
  isGenerating,
  onRedraft,
  onApplyDraft,
  onSendDirect,
}: CopilotPanelProps) {
  const lastCustomerMessage: Message | null = activeTicket
    ? [...activeTicket.messages].reverse().find((m) => m.sender === "customer") || null
    : null;

  const handleRedraft = (tone: string) => {
    if (!activeTicket || !lastCustomerMessage) return;
    onRedraft(activeTicket.id, lastCustomerMessage.id, tone);
  };

  const handleSendDirect = (content: string) => {
    if (!activeTicket) return;
    onSendDirect(activeTicket.id, content);
  };

  return (
    <section className="copilot-panel">
      <div className="copilot-header">
        <div className="copilot-sparkle">
          <Sparkles className="w-4.5 h-4.5" />
        </div>
        <h3 className="copilot-title notranslate">AI Copilot</h3>
      </div>

      <div className="copilot-content">
        <DraftCard
          lastCustomerMessage={lastCustomerMessage}
          isGenerating={isGenerating}
          onRedraft={handleRedraft}
          onApply={onApplyDraft}
          onSendDirect={handleSendDirect}
        />
      </div>
    </section>
  );
}
