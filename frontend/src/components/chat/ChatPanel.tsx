"use client";

import React, { useState, useEffect, useRef } from "react";
import { CheckCircle, MessageSquare, UserCheck, Lock } from "lucide-react";
import { Conversation, QuickTemplate } from "@/lib/types";
import { QUICK_TEMPLATES } from "@/lib/constants";
import MessageBubble from "./MessageBubble";
import QuickReplies from "./QuickReplies";
import ChatInput from "./ChatInput";
import TypingIndicator from "@/components/ui/TypingIndicator";
import { useToast } from "@/components/ui/Toast";

interface ChatPanelProps {
  activeTicket: Conversation | null;
  isGenerating: boolean;
  draftToApply?: string;
  onDraftApplied?: () => void;
  onSendMessage: (conversationId: string, content: string) => void;
  onResolveTicket: (conversationId: string) => void;
  onAssignTicket: (conversationId: string, userId: string | null) => void;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
}

export default function ChatPanel({
  activeTicket,
  isGenerating,
  draftToApply,
  onDraftApplied,
  onSendMessage,
  onResolveTicket,
  onAssignTicket,
}: ChatPanelProps) {
  const [replyContent, setReplyContent] = useState("");
  const messageLogRef = useRef<HTMLDivElement | null>(null);
  const { addToast } = useToast();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Load current user on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          setCurrentUser(JSON.parse(userStr));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messageLogRef.current) {
      messageLogRef.current.scrollTop = messageLogRef.current.scrollHeight;
    }
  }, [activeTicket?.messages, isGenerating]);

  // Apply draft from CopilotPanel's "Apply to Input" button
  useEffect(() => {
    if (draftToApply) {
      setReplyContent(draftToApply);
      onDraftApplied?.();
    }
  }, [draftToApply, onDraftApplied]);

  const isAssignedToOther = !!(
    activeTicket?.assignedUserId &&
    currentUser &&
    activeTicket.assignedUserId !== currentUser.id
  );
  
  const isUnassigned = !activeTicket?.assignedUserId;
  
  const isAssignedToMe = !!(
    activeTicket?.assignedUserId &&
    currentUser &&
    activeTicket.assignedUserId === currentUser.id
  );

  const handleSend = () => {
    if (!activeTicket || !replyContent.trim()) return;
    if (activeTicket.status === "resolved") {
      addToast("Cannot reply to a resolved ticket.", "error");
      return;
    }
    if (isAssignedToOther) {
      addToast("This ticket is assigned to someone else, you cannot send a message.", "error");
      return;
    }
    if (isUnassigned) {
      addToast("Please assign this ticket to yourself before replying.", "error");
      return;
    }
    onSendMessage(activeTicket.id, replyContent);
    setReplyContent("");
    addToast("Message sent", "success");
  };

  const handleResolve = () => {
    if (!activeTicket) return;
    onResolveTicket(activeTicket.id);
    addToast("Ticket marked as resolved", "success");
  };

  const handleApplyTemplate = (text: string) => {
    if (!activeTicket) return;
    const populated = text.replace("{name}", activeTicket.customer.name);
    setReplyContent(populated);
  };

  // Build quick templates with customer name
  const templates: QuickTemplate[] = QUICK_TEMPLATES.map((t) => ({
    label: t.label,
    text: activeTicket ? t.text.replace("{name}", activeTicket.customer.name) : t.text,
  }));

  if (!activeTicket) {
    return (
      <section className="chat-area">
        <div className="empty-state">
          <MessageSquare className="w-14 h-14 empty-state-icon" />
          <h3 className="empty-state-title">No Active Ticket Selected</h3>
          <p className="empty-state-text">
            Select a ticket from the left menu to view and respond to customer chats.
          </p>
        </div>
      </section>
    );
  }

  const getStatusText = (status: string) => {
    if (status === "open") return "Open";
    if (status === "resolved") return "Resolved";
    return "Pending";
  };

  return (
    <section className="chat-area">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-user">
          <div className="chat-header-avatar-wrapper">
            <img
              src={activeTicket.customer.avatar}
              alt={activeTicket.customer.name}
              className="chat-header-avatar"
            />
            <div className={`chat-header-indicator ${activeTicket.customer.channel === "whatsapp" ? "whatsapp" : "web"}`} />
          </div>
          <div>
            <h3 className="chat-header-name">{activeTicket.customer.name}</h3>
            <div className="chat-header-meta">
              <span className="notranslate">
                {activeTicket.customer.channel === "whatsapp" ? "WhatsApp" : "Web Chat"}
              </span>
              <span className="meta-divider">•</span>
              <span className="capitalize">{getStatusText(activeTicket.status)}</span>
              {activeTicket.assignedUser && (
                <>
                  <span className="meta-divider">•</span>
                  <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                    Assigned to: {activeTicket.assignedUser.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="chat-actions" style={{ display: "flex", gap: "8px" }}>
          {activeTicket.status !== "resolved" && isAssignedToMe && (
            <button onClick={handleResolve} className="btn-resolve" type="button">
              <CheckCircle className="w-4 h-4" />
              Mark as Resolved
            </button>
          )}

          {activeTicket.status !== "resolved" && isAssignedToMe && (
            <button
              onClick={() => onAssignTicket(activeTicket.id, null)}
              className="btn-secondary"
              style={{ fontSize: "11px", color: "var(--accent)" }}
              title="Return to Pool"
              type="button"
            >
              Return to Pool
            </button>
          )}
        </div>
      </header>

      {/* Bilet Dağıtım ve Atama Bilgi Barları */}
      {activeTicket.status !== "resolved" && (
        <>
          {isUnassigned && (
            <div style={{ background: "rgba(59, 130, 246, 0.1)", borderBottom: "1px solid rgba(59, 130, 246, 0.2)", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <UserCheck className="w-4 h-4" style={{ color: "var(--accent)" }} />
                This ticket is currently unassigned. You must assign it to yourself to respond.
              </span>
              <button
                onClick={() => onAssignTicket(activeTicket.id, currentUser?.id || null)}
                className="btn-draft-apply"
                style={{ width: "auto", padding: "4px 10px", fontSize: "11px" }}
                type="button"
              >
                Assign to Me
              </button>
            </div>
          )}

          {isAssignedToOther && (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", borderBottom: "1px solid rgba(239, 68, 68, 0.2)", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  This ticket is currently assigned to <strong>{activeTicket.assignedUser?.name}</strong>. You cannot send messages.
                </span>
              </div>
              {currentUser?.role === "admin" && (
                <button
                  onClick={() => onAssignTicket(activeTicket.id, currentUser?.id || null)}
                  className="btn-secondary"
                  style={{ width: "auto", padding: "4px 10px", fontSize: "11px", borderColor: "var(--accent)", color: "var(--accent)", whiteSpace: "nowrap" }}
                  type="button"
                >
                  Take Over
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Messages */}
      <div className="message-log" ref={messageLogRef}>
        <div className="message-bubble-wrapper system">
          <div className="message-bubble notranslate">
            Chat started • AI Copilot Online
          </div>
        </div>

        {activeTicket.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} customer={activeTicket.customer} />
        ))}
      </div>

      {/* Quick Replies */}
      {activeTicket.status !== "resolved" && isAssignedToMe && (
        <QuickReplies templates={templates} onApply={handleApplyTemplate} />
      )}

      {/* Input */}
      {(() => {
        let isDisabled = false;
        let disabledNotice: string | null = null;

        if (activeTicket.status === "resolved") {
          isDisabled = true;
          disabledNotice = "This ticket has been marked as resolved.";
        } else if (isAssignedToOther) {
          isDisabled = true;
          disabledNotice = `This ticket is currently assigned to ${activeTicket.assignedUser?.name || "another agent"}.`;
        } else if (isUnassigned) {
          isDisabled = true;
          disabledNotice = "This ticket is currently unassigned. Please assign it to yourself before replying.";
        }

        return (
          <ChatInput
            value={replyContent}
            onChange={setReplyContent}
            onSend={handleSend}
            isDisabled={isDisabled}
            disabledNotice={disabledNotice}
            customerName={activeTicket.customer.name}
          />
        );
      })()}
    </section>
  );
}
