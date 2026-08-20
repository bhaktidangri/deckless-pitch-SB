"use client";

// The real chat for /buyer/chat — a RAG pipeline against this buyer's
// vendor's own published solution_capabilities + solution_evidence (see
// ask-grounded-question's own header comment), not the Yoxa agent's
// query_workspace_evidence HITL node (that's what LiveChatPanel/
// live-chat-panel.tsx still does, and stays doing, for /buyer/scenarios —
// this is a separate component on purpose so that page's agent-HITL flow
// is untouched). Every answer is either grounded (shows what it cited) or
// honestly escalated to the vendor via capability_frontier — never a
// confident-sounding guess.
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, Sparkles, UserCog } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ResponseStatusBadge } from "@/components/shared/status-badge";
import {
  askGroundedQuestion,
  getLatestConversationMessages,
  AskGroundedQuestionError,
  type CitedCapability,
  type ConversationMessageRow,
} from "@/lib/api/buyer-lookup";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { cn } from "@/lib/utils";

export function GroundedChatPanel({
  buyerId,
  vendorId,
  vendorName,
}: {
  buyerId: string | null;
  vendorId: string | null;
  vendorName: string | null;
}) {
  const [messages, setMessages] = useState<ConversationMessageRow[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeBump, setRealtimeBump] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useRealtimeRefresh(buyerId ? [{ table: "messages" }] : [], () => setRealtimeBump((n) => n + 1), [buyerId]);

  useEffect(() => {
    if (!buyerId) return;
    let cancelled = false;
    getLatestConversationMessages(buyerId)
      .then(({ conversationId: cid, messages: rows }) => {
        if (cancelled) return;
        setConversationId(cid);
        setMessages(rows);
      })
      .catch(() => {
        // transient — the next realtime event or manual send retries
      });
    return () => {
      cancelled = true;
    };
  }, [buyerId, realtimeBump]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || !buyerId || sending) return;
    setInput("");
    setSending(true);
    setError(null);
    // Optimistic: show the buyer's own question immediately, the real row
    // (with its real id) replaces it once the round trip completes.
    const optimisticId = `optimistic-${Date.now()}`;
    setMessages((prev) => [...prev, { id: optimisticId, role: "user", content: question, responseStatus: null, evidence: null, createdAt: new Date().toISOString() }]);
    try {
      const result = await askGroundedQuestion({ buyerId, vendorId, question, conversationId });
      setConversationId(result.conversationId);
      setMessages((prev) => [...prev.filter((m) => m.id !== optimisticId), result.userMessage, result.assistantMessage]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInput(question);
      setError(err instanceof AskGroundedQuestionError ? err.message : "Could not reach the assistant. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Ask anything about {vendorName ? `${vendorName}'s` : "your vendor's"} services, consulting, or capabilities — grounded in
            their published evidence, not a guess.
          </p>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <AnimatePresence>
          {sending && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-3">
              <Avatar name="Grounding Agent" color="brand" size="sm" className="mt-0.5" />
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500 [animation-delay:300ms]" />
                <span className="ml-1">Checking the evidence…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-border p-4">
        {error && <p className="mb-2 text-xs text-escalated">{error}</p>}
        <form onSubmit={send} className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(e);
              }
            }}
            placeholder="Ask about pricing, migration, compliance, ROI..."
            rows={1}
            disabled={!buyerId || sending}
            className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || !buyerId || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-transform hover:bg-brand-700 disabled:opacity-40 disabled:hover:bg-brand-600 active:scale-95"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ConversationMessageRow }) {
  const isUser = message.role === "user";
  const isEscalated = message.responseStatus === "escalated";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <Avatar name={isUser ? "You" : "Grounding Agent"} color={isUser ? "accent" : "brand"} size="sm" className="mt-0.5" />
      <div className={cn("max-w-[80%] space-y-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser ? "rounded-tr-sm bg-brand-600 text-white" : "rounded-tl-sm border border-border bg-surface-2 text-foreground"
          )}
        >
          {message.content}
        </div>
        {!isUser && message.responseStatus && (
          <div className="flex flex-wrap items-center gap-2">
            <ResponseStatusBadge status={message.responseStatus} />
            {isEscalated && (
              <span className="flex items-center gap-1 text-[11px] text-subtle">
                <UserCog className="h-3 w-3" /> A specialist will follow up
              </span>
            )}
          </div>
        )}
        {!isUser && message.evidence && message.evidence.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] text-subtle">
              <Sparkles className="h-3 w-3" /> Based on:
            </span>
            {message.evidence.map((c: CitedCapability) => (
              <Badge key={c.capabilityId} variant="outline" size="sm">
                {c.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
