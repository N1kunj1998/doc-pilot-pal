import type { ChatMessage } from "@/lib/mock-data";
import { CitationChip } from "./CitationChip";
import { cn } from "@/lib/utils";

export function ChatMessageView({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
          isUser ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
        )}
      >
        {isUser ? "You" : "AI"}
      </div>
      <div className={cn("flex-1 max-w-[80%]", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser ? "bg-primary text-primary-foreground" : "bg-card border"
          )}
        >
          {message.content}
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <CitationChip key={c.id} citation={c} index={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
