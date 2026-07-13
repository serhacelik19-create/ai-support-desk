"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Search, UserCheck, Inbox, Archive } from "lucide-react";
import { Conversation, SidebarTab } from "@/lib/types";
import TicketItem from "./TicketItem";
import Skeleton from "@/components/ui/Skeleton";

interface SidebarProps {
  conversations: Conversation[];
  selectedId: string | null;
  sidebarTab: SidebarTab;
  isConnected: boolean;
  searchQuery: string;
  onSelectTicket: (id: string) => void;
  onTabChange: (tab: SidebarTab) => void;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
}

export default function Sidebar({
  conversations,
  selectedId,
  sidebarTab,
  isConnected,
  searchQuery,
  onSelectTicket,
  onTabChange,
  onSearchChange,
  isLoading,
}: SidebarProps) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

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

  // Filter conversations based on selected tab and user
  const filteredByTab = conversations.filter((c) => {
    if (sidebarTab === "assigned") {
      if (currentUser?.role === "admin") {
        return c.status !== "resolved" && c.assignedUserId !== null;
      }
      return c.status !== "resolved" && c.assignedUserId === currentUser?.id;
    } else if (sidebarTab === "unassigned") {
      return c.status !== "resolved" && !c.assignedUserId;
    } else {
      return c.status === "resolved";
    }
  });

  // Calculate tab counts
  const assignedCount = conversations.filter((c) => {
    if (currentUser?.role === "admin") {
      return c.status !== "resolved" && c.assignedUserId !== null;
    }
    return c.status !== "resolved" && c.assignedUserId === currentUser?.id;
  }).length;

  const unassignedCount = conversations.filter(
    (c) => c.status !== "resolved" && !c.assignedUserId
  ).length;

  const resolvedCount = conversations.filter((c) => c.status === "resolved").length;

  const getEmptyStateText = () => {
    if (sidebarTab === "assigned") {
      return currentUser?.role === "admin" 
        ? "No assigned open tickets found." 
        : "No open tickets assigned to you found.";
    }
    if (sidebarTab === "unassigned") return "No tickets waiting in the support pool.";
    return "No resolved tickets found.";
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-section">
          <div className="brand-logo">CS</div>
          <div className="brand-title notranslate">Support Desk</div>
        </div>

        <div className={`connection-status-pill ${isConnected ? "online" : "offline"}`}>
          <span className="status-led" />
          <span>{isConnected ? "Active" : "Offline"}</span>
        </div>
      </div>

      <div className="sidebar-search">
        <Search className="sidebar-search-icon" />
        <input
          type="text"
          placeholder="Search tickets..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="sidebar-search-input"
        />
      </div>

      {/* 3'lü Kurumsal Sekme Sistemi */}
      <div className="sidebar-tabs" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px", padding: "0 8px 8px 8px" }}>
        <button
          onClick={() => onTabChange("assigned")}
          className={`sidebar-tab-btn ${sidebarTab === "assigned" ? "active" : ""}`}
          style={{ fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 2px", gap: "2px" }}
          type="button"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span style={{ fontSize: "10px" }}>{currentUser?.role === "admin" ? "All Assigned" : "Mine"}</span>
          <span className="sidebar-tab-count" style={{ marginLeft: 0, marginTop: "2px" }}>{assignedCount}</span>
        </button>

        <button
          onClick={() => onTabChange("unassigned")}
          className={`sidebar-tab-btn ${sidebarTab === "unassigned" ? "active" : ""}`}
          style={{ fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 2px", gap: "2px" }}
          type="button"
        >
          <Inbox className="w-3.5 h-3.5" />
          <span style={{ fontSize: "10px" }}>Pool</span>
          <span className="sidebar-tab-count" style={{ marginLeft: 0, marginTop: "2px" }}>{unassignedCount}</span>
        </button>

        <button
          onClick={() => onTabChange("resolved")}
          className={`sidebar-tab-btn ${sidebarTab === "resolved" ? "active" : ""}`}
          style={{ fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 2px", gap: "2px" }}
          type="button"
        >
          <Archive className="w-3.5 h-3.5" />
          <span style={{ fontSize: "10px" }}>Resolved</span>
          <span className="sidebar-tab-count" style={{ marginLeft: 0, marginTop: "2px" }}>{resolvedCount}</span>
        </button>
      </div>

      {/* Bilet Listesi */}
      <div className="customer-list">
        {isLoading ? (
          <div className="skeleton-ticket-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-ticket-item">
                <Skeleton variant="avatar" width="42px" height="42px" />
                <div className="skeleton-ticket-info">
                  <Skeleton variant="text" width="70%" height="14px" />
                  <Skeleton variant="text" width="90%" height="12px" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredByTab.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px 10px" }}>
            <MessageSquare className="empty-state-icon w-8 h-8" />
            <p className="empty-state-text" style={{ fontSize: "12px", marginTop: "8px" }}>{getEmptyStateText()}</p>
          </div>
        ) : (
          filteredByTab.map((conv) => (
            <TicketItem
              key={conv.id}
              conversation={conv}
              isSelected={conv.id === selectedId}
              onSelect={onSelectTicket}
            />
          ))
        )}
      </div>
    </aside>
  );
}
