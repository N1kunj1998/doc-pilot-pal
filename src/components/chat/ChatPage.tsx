import { useEffect, useRef, useState } from "react";
import { Plus, Send, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChatMessageView } from "./ChatMessage";
import { fetchChatThreads, sendChatMessage } from "@/lib/api";
import type { ChatThread, ChatMessage } from "@/lib/mock-data";

export function ChatPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatThreads().then((t) => {
      setThreads(t);
      setActiveId(t[0]?.id ?? null);
    });
  }, []);

  const active = threads.find((t) => t.id === activeId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages.length, thinking]);

  const handleSend = async () => {
    if (!input.trim() || !active) return;
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };
    const text = input.trim();
    setInput("");
    setThreads((prev) =>
      prev.map((t) => (t.id === active.id ? { ...t, messages: [...t.messages, userMsg] } : t))
    );
    setThinking(true);
    const reply = await sendChatMessage(active.id, text);
    setThreads((prev) =>
      prev.map((t) => (t.id === active.id ? { ...t, messages: [...t.messages, reply] } : t))
    );
    setThinking(false);
  };

  const newChat = () => {
    const id = `t_${Date.now()}`;
    const t: ChatThread = { id, title: "New conversation", updatedAt: new Date().toISOString(), messages: [] };
    setThreads((prev) => [t, ...prev]);
    setActiveId(id);
  };

  return (
    <div className="flex h-full">
      {/* Chat history */}
      <div className="w-72 shrink-0 border-r bg-sidebar/40 flex flex-col">
        <div className="p-3 border-b space-y-2">
          <Button onClick={newChat} className="w-full justify-start gap-2" variant="default">
            <Plus className="h-4 w-4" /> New chat
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search chats" className="h-8 pl-8 text-sm bg-background" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={cn(
                "w-full text-left rounded-md px-2.5 py-2 text-sm transition-colors truncate",
                t.id === activeId
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              {t.title}
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        <div className="h-14 border-b flex items-center px-6">
          <h2 className="font-medium truncate">{active?.title ?? "Select a chat"}</h2>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
            {active?.messages.length === 0 && !thinking && (
              <div className="text-center py-16">
                <h3 className="text-lg font-semibold">Ask anything about your team's docs</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  DocPilot answers using your uploaded documents, with inline citations.
                </p>
              </div>
            )}
            {active?.messages.map((m) => <ChatMessageView key={m.id} message={m} />)}
            {thinking && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">AI</div>
                <div className="text-sm text-muted-foreground italic pt-1.5 flex items-center gap-1">
                  Thinking
                  <span className="inline-flex gap-0.5">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse" />
                    <span className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:150ms]" />
                    <span className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t bg-background p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-2xl border bg-card shadow-[var(--shadow-soft)] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask a question about your team's documents…"
                className="border-0 resize-none min-h-[60px] max-h-40 focus-visible:ring-0 shadow-none bg-transparent pr-14"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || thinking}
                className="absolute bottom-2 right-2 h-9 w-9 rounded-lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              DocPilot may make mistakes. Verify with the cited sources.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
