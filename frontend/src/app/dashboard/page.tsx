"use client";

import React, { useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useSearch } from "@/hooks/useSearch";
import { SidebarTab } from "@/lib/types";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatPanel from "@/components/chat/ChatPanel";
import CopilotPanel from "@/components/copilot/CopilotPanel";
import { useToast } from "@/components/ui/Toast";

export default function DashboardPage() {
  const {
    isConnected,
    conversations,
    selectedId,
    setSelectedId,
    isGenerating,
    sendMessage,
    resolveTicket,
    redraft,
    assignTicket,
  } = useSocket();

  const { searchQuery, setSearchQuery, filteredConversations } = useSearch(conversations);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("assigned");
  const [replyFromDraft, setReplyFromDraft] = useState("");
  const { addToast } = useToast();

  const activeTicket = conversations.find((c) => c.id === selectedId) || null;
  const isLoading = !isConnected && conversations.length === 0;

  const handleApplyDraft = (draft: string) => {
    setReplyFromDraft(draft);
  };

  const handleSendDirect = (conversationId: string, content: string) => {
    sendMessage(conversationId, content);
    addToast("AI draft sent directly", "success");
  };

  return (
    <div className="app-container">
      <Sidebar
        conversations={filteredConversations}
        selectedId={selectedId}
        sidebarTab={sidebarTab}
        isConnected={isConnected}
        searchQuery={searchQuery}
        onSelectTicket={setSelectedId}
        onTabChange={setSidebarTab}
        onSearchChange={setSearchQuery}
        isLoading={isLoading}
      />

      <ChatPanel
        activeTicket={activeTicket}
        isGenerating={isGenerating}
        draftToApply={replyFromDraft}
        onDraftApplied={() => setReplyFromDraft("")}
        onSendMessage={sendMessage}
        onResolveTicket={resolveTicket}
        onAssignTicket={assignTicket}
      />

      <section className="copilot-panel-wrapper">
        <CopilotPanel
          activeTicket={activeTicket}
          conversations={conversations}
          isGenerating={isGenerating}
          onRedraft={redraft}
          onApplyDraft={handleApplyDraft}
          onSendDirect={handleSendDirect}
        />
      </section>
    </div>
  );
}
