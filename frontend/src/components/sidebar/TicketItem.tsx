import { Conversation } from "@/lib/types";
import { formatRelativeTime } from "@/lib/timeUtils";

interface TicketItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function TicketItem({ conversation, isSelected, onSelect }: TicketItemProps) {
  const lastMsg = conversation.messages[conversation.messages.length - 1];

  const getStatusText = (status: string) => {
    if (status === "open") return "Open";
    if (status === "resolved") return "Resolved";
    return "Pending";
  };

  return (
    <button
      onClick={() => onSelect(conversation.id)}
      className={`customer-item ${isSelected ? "active" : ""}`}
      type="button"
      style={{ display: "flex", width: "100%", textAlign: "left", gap: "10px" }}
    >
      <div className="avatar-wrapper">
        <img
          src={conversation.customer.avatar}
          alt={conversation.customer.name}
          className="avatar"
        />
        <div className={`channel-badge ${conversation.customer.channel === "whatsapp" ? "whatsapp" : "web"}`}>
          {conversation.customer.channel === "whatsapp" ? "WA" : "WB"}
        </div>
      </div>

      <div className="customer-info" style={{ flex: 1 }}>
        <div className="customer-name-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span className="customer-name" style={{ fontWeight: 600, fontSize: "13px" }}>{conversation.customer.name}</span>
          <span className={`ticket-status ${conversation.status}`} style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "var(--radius-sm)" }}>
            {getStatusText(conversation.status)}
          </span>
        </div>
        <span className="last-message" style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lastMsg ? lastMsg.content : "No messages yet"}
        </span>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
          {conversation.assignedUser ? (
            <span style={{ fontSize: "10px", color: "var(--text-tertiary)", fontWeight: 500 }}>
              Assigned: {conversation.assignedUser.name}
            </span>
          ) : (
            <span style={{ fontSize: "10px", color: "var(--accent)", fontWeight: 500 }}>
              Unassigned
            </span>
          )}
          {lastMsg && (
            <span className="ticket-time" style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
              {formatRelativeTime(lastMsg.timestamp)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
