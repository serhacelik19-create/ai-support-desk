import { Message, Customer } from "@/lib/types";
import { formatRelativeTime } from "@/lib/timeUtils";

interface MessageBubbleProps {
  message: Message;
  customer: Customer;
}

export default function MessageBubble({ message, customer }: MessageBubbleProps) {
  const isCustomer = message.sender === "customer";
  const isSystem = message.sender === "system";

  if (isSystem) {
    return (
      <div className="message-bubble-wrapper system">
        <div className="message-bubble">{message.content}</div>
      </div>
    );
  }

  return (
    <div className={`message-bubble-wrapper ${message.sender}`}>
      <div className="message-avatar-container">
        {isCustomer ? (
          <img
            src={customer.avatar}
            alt={customer.name}
            className="chat-bubble-avatar"
          />
        ) : (
          <div className="chat-bubble-avatar agent-avatar notranslate">AG</div>
        )}
      </div>

      <div className="message-content-wrapper">
        <span className="message-sender-name">
          {isCustomer ? customer.name : "Support Agent (You)"}
        </span>
        <div className="message-bubble">{message.content}</div>
        <span className="message-timestamp">
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
