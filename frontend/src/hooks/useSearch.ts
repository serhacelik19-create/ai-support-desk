"use client";

import { useState, useMemo } from "react";
import { Conversation } from "@/lib/types";

export function useSearch(conversations: Conversation[]) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      const nameMatch = conv.customer.name.toLowerCase().includes(query);
      const lastMsg = conv.messages[conv.messages.length - 1];
      const msgMatch = lastMsg?.content.toLowerCase().includes(query) || false;
      return nameMatch || msgMatch;
    });
  }, [conversations, searchQuery]);

  return { searchQuery, setSearchQuery, filteredConversations };
}
