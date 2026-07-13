import { Zap } from "lucide-react";
import { QuickTemplate } from "@/lib/types";

interface QuickRepliesProps {
  templates: QuickTemplate[];
  onApply: (text: string) => void;
}

export default function QuickReplies({ templates, onApply }: QuickRepliesProps) {
  return (
    <div className="quick-replies-container">
      {templates.map((tpl, i) => (
        <button key={i} onClick={() => onApply(tpl.text)} className="quick-reply-btn">
          <Zap className="w-3 h-3 quick-reply-zap" />
          {tpl.label}
        </button>
      ))}
    </div>
  );
}
