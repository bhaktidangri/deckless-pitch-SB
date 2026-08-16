"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, FileText, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ResponseStatusBadge } from "@/components/shared/status-badge";
import type { ConversationMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const cannedReplies: { keywords: string[]; message: Omit<ConversationMessage, "id" | "createdAt" | "role"> }[] = [
  {
    keywords: ["price", "pricing", "cost", "much"],
    message: {
      content:
        "Based on your current usage and CloudNova's published pricing tiers, your estimated monthly platform cost after migration is ₹2.1L-₹2.4L, before the optimization savings are applied.",
      responseStatus: "modelled",
      assumptions: ["Based on Growth tier pricing for 500-1,000 users", "Excludes one-time migration services fee"],
      evidence: [{ sourceLabel: "CloudNova_Pricing_Sheet_Q3.pdf", sourceType: "pdf", snippet: "Growth tier pricing scales with active compute hours and storage volume." }],
    },
  },
  {
    keywords: ["security", "compliance", "pci", "hipaa"],
    message: {
      content:
        "CloudNova's Security Platform includes SOC2 Type II and ISO 27001 aligned controls, with dedicated BFSI and healthcare compliance runbooks verified in their documentation. PCI-DSS-specific retail controls are not yet explicitly confirmed — I've flagged this to the vendor.",
      responseStatus: "escalated",
      evidence: [{ sourceLabel: "cloudnova.io", sourceType: "website", snippet: "CloudNova Security Platform includes SOC2 Type II and ISO 27001 aligned controls out of the box." }],
    },
  },
  {
    keywords: ["timeline", "long", "when", "weeks", "months"],
    message: {
      content:
        "Your requested 6-month timeline aligns with CloudNova's phased migration methodology for an organization your size — typically 4-6 months from kickoff to full cutover, based on similar prior engagements.",
      responseStatus: "modelled",
      assumptions: ["Assumes no major scope changes mid-migration", "Assumes buyer team availability for weekly checkpoints"],
    },
  },
];

const fallbackReply: Omit<ConversationMessage, "id" | "createdAt" | "role"> = {
  content:
    "That's a great question, and it's specific enough that I don't have verified information to answer confidently. I've created a Capability Frontier item so a CloudNova specialist can confirm it directly.",
  responseStatus: "escalated",
};

export function ChatPanel({ initialMessages }: { initialMessages: ConversationMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const nextId = (prefix: string) => `${prefix}-${++idCounter.current}`;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;
    const userMsg: ConversationMessage = {
      id: nextId("local"),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);

    const lower = content.toLowerCase();
    const matched = cannedReplies.find((c) => c.keywords.some((k) => lower.includes(k)));
    const replyContent = matched?.message ?? fallbackReply;

    setTimeout(() => {
      setThinking(false);
      setMessages((m) => [
        ...m,
        {
          id: nextId("local-reply"),
          role: "assistant",
          createdAt: new Date().toISOString(),
          ...replyContent,
        },
      ]);
    }, 1100);
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <AnimatePresence>
          {thinking && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <Avatar name="CloudNova AI" color="brand" size="sm" />
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-surface-2 px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-subtle"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-border p-4">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {["What can we realistically save?", "Is this PCI-DSS compliant?", "How long will migration take?"].map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted transition-colors hover:border-brand-300 hover:text-brand-600 dark:hover:text-brand-400"
            >
              {s}
            </button>
          ))}
        </div>
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
            className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-transform hover:bg-brand-700 disabled:opacity-40 disabled:hover:bg-brand-600 active:scale-95"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      <Avatar name={isUser ? "You" : "CloudNova AI"} color={isUser ? "accent" : "brand"} size="sm" className="mt-0.5" />
      <div className={cn("max-w-[80%] space-y-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-brand-600 text-white"
              : "rounded-tl-sm border border-border bg-surface-2 text-foreground"
          )}
        >
          {message.content}
        </div>
        {!isUser && message.responseStatus && (
          <div className="flex flex-wrap items-center gap-2">
            <ResponseStatusBadge status={message.responseStatus} />
          </div>
        )}
        {!isUser && message.assumptions && message.assumptions.length > 0 && (
          <div className="rounded-lg border border-modelled-border bg-modelled-bg px-3 py-2">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-modelled">
              <Sparkles className="h-3 w-3" /> Assumptions used
            </p>
            <ul className="mt-1 space-y-0.5">
              {message.assumptions.map((a, i) => (
                <li key={i} className="text-xs text-foreground/80">
                  &bull; {a}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!isUser && message.evidence && message.evidence.length > 0 && (
          <div className="space-y-1">
            {message.evidence.map((ev, i) => (
              <div key={i} className="flex items-start gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] text-muted">
                <FileText className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  <span className="font-medium text-foreground">{ev.sourceLabel}</span> — &ldquo;{ev.snippet}&rdquo;
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
