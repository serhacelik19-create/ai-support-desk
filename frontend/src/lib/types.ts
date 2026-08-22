// Shared type definitions for the AI Support Desk application

export interface Customer {
  id: string;
  name: string;
  channel: "whatsapp" | "web";
  avatar: string;
}

export interface Message {
  id: string;
  sender: "customer" | "agent" | "system";
  content: string;
  timestamp: string;
  draftReply?: string;
}

export interface Conversation {
  id: string;
  status: "open" | "resolved" | "pending";
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  messages: Message[];
  assignedUserId?: string | null;
  assignedUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export type SidebarTab = "assigned" | "unassigned" | "resolved";

export type ToneOption = "friendly" | "professional" | "empathetic" | "persuasive";

export interface QuickTemplate {
  label: string;
  text: string;
}

export interface AnalyticsData {
  totalConversations: number;
  openCount: number;
  resolvedCount: number;
  totalMessages: number;
  avgResponseTime: number;
  channelDistribution: {
    whatsapp: number;
    web: number;
  };
  dailyActivity?: {
    day: string;
    count: number;
  }[];
}
