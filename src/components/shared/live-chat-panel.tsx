"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, Clock } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ResponseStatusBadge } from "@/components/shared/status-badge";
import { getLatestConversationMessages, type BuyerApprovalNodeKey, type ConversationMessageRow } from "@/lib/api/buyer-lookup";
import { usePendingApproval } from "@/lib/hooks/use-pending-approval";
import { cn } from "@/lib/utils";

// Real chat surface for the buyer workflow's two chat-shaped human_approval
// nodes (Query Workspace Evidence on /buyer/chat, Answer Scenario Questions
// on /buyer/scenarios) — replaces the old scripted ChatPanel's canned
// keyword replies entirely.
//
// PRD §7.1: these nodes are wired as human_approval (buttons-only) but are
// described as waiting for typed text. This panel always shows a real text
// box; when the run is currently paused at this node (a pending approval
// exists), the typed message is sent as the resume payload. When it isn't
// paused yet, the message is queued locally and sent the moment a pause for
// this node appears — matching the async "the tool call itself is what
// surfaces the question" behavior the PRD describes. Whether Yoxa's resume
// contract actually accepts free text at all is unconfirmed (see
// src/app/api/buyer-approvals/[requestId]/respond/route.ts) — this is the
// one PRD §7.1 defect that needs live confirmation, not just code.
export function LiveChatPanel({
  buyerId,
  workflowRunIds,
  nodeKey,
}: {
  buyerId: string | null;
  workflowRunIds: string[];
  nodeKey: BuyerApprovalNodeKey;
}) {
  const [messages, setMessages] = useState<ConversationMessageRow[]>([]);
  const [input, setInput] = useState("");
  const [queued, setQueued] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { approval, respond, responding } = usePendingApproval(nodeKey, { buyerId, workflowRunIds, enabled: !!buyerId });

  useEffect(() => {
    if (!buyerId) return;
    let cancelled = false;
    async function load() {
      try {
        const rows = await getLatestConversationMessages(buyerId!);
        if (!cancelled) setMessages(rows);
      } catch {
        // transient — next tick retries
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [buyerId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, queued]);

  // Deliver a queued message the moment the run pauses at this node.
  useEffect(() => {
    if (approval && queued) {
      respond({ text: queued });
      setQueued(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approval?.requestId]);

  function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput("");
    if (approval) {
      respond({ text: content });
    } else {
      setQueued(content);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5">
        {messages.length === 0 && !queued && (
          <p className="text-sm text-muted">Ask anything about your solution — grounded in the vendor&apos;s published capabilities.</p>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <AnimatePresence>
          {queued && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-row-reverse items-start gap-3">
              <Avatar name="You" color="accent" size="sm" />
              <div className="max-w-[80%] space-y-1.5">
                <div className="rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-3 text-sm text-white opacity-70">{queued}</div>
                <p className="flex items-center gap-1 text-[11px] text-subtle">
                  <Clock className="h-3 w-3" /> Waiting for the agent to be ready for your question&hellip;
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-border p-4">
        {approval && approval.options.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {approval.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => respond({ optionId: opt.id })}
                disabled={responding}
                className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted transition-colors hover:border-brand-300 hover:text-brand-600 disabled:opacity-50 dark:hover:text-brand-400"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about pricing, migration, compliance, ROI..."
            rows={1}
            disabled={!buyerId}
            className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || !buyerId}
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
          </div>
        )}
      </div>
    </motion.div>
  );
}
