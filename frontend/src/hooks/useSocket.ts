"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { BACKEND_URL } from "@/lib/constants";
import { Conversation, Message } from "@/lib/types";

interface UseSocketReturn {
  isConnected: boolean;
  conversations: Conversation[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isGenerating: boolean;
  sendMessage: (conversationId: string, content: string) => void;
  resolveTicket: (conversationId: string) => void;
  redraft: (conversationId: string, lastMessageId: string, tone: string) => void;
  assignTicket: (conversationId: string, userId: string | null) => void;
}

export function useSocket(): UseSocketReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || process.env.NEXT_PUBLIC_API_AUTH_TOKEN || "demo-auth-token-123" : "demo-auth-token-123";
    const socket = io(BACKEND_URL, {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("ticket:list");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("ticket:list:response", (loadedTickets: Conversation[]) => {
      setConversations(loadedTickets);
    });

    socket.on("ticket:new", (newTicket: Conversation) => {
      setConversations((prev) => {
        if (prev.some((t) => t.id === newTicket.id)) return prev;
        return [newTicket, ...prev];
      });
    });

    socket.on("message:new", (payload: { conversationId: string; message: Message }) => {
      const { conversationId, message } = payload;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              updatedAt: new Date().toISOString(),
              messages: [...c.messages, message],
            };
          }
          return c;
        })
      );
    });

    socket.on(
      "message:draft:updated",
      (payload: { conversationId: string; messageId: string; draftReply: string }) => {
        const { conversationId, messageId, draftReply } = payload;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === conversationId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, draftReply } : m
                ),
              };
            }
            return c;
          })
        );
        setIsGenerating(false);
      }
    );

    socket.on("ticket:updated", (updatedTicket: Conversation) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === updatedTicket.id ? updatedTicket : c))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (!socketRef.current || !content.trim()) return;
    socketRef.current.emit("message:send", {
      conversationId,
      content: content.trim(),
    });
  }, []);

  const resolveTicket = useCallback((conversationId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit("ticket:resolve", conversationId);
  }, []);

  const redraft = useCallback((conversationId: string, lastMessageId: string, tone: string) => {
    if (!socketRef.current) return;
    setIsGenerating(true);
    socketRef.current.emit("ai:redraft", {
      conversationId,
      lastMessageId,
      tone,
    });
  }, []);

  const assignTicket = useCallback((conversationId: string, userId: string | null) => {
    if (!socketRef.current) return;
    socketRef.current.emit("ticket:assign", { conversationId, userId });
  }, []);

  return {
    isConnected,
    conversations,
    selectedId,
    setSelectedId,
    isGenerating,
    sendMessage,
    resolveTicket,
    redraft,
    assignTicket,
  };
}
