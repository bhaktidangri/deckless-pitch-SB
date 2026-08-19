"use client";

// The one persistent "where are we" indicator for the buyer journey — lives
// in the portal header (via PortalShell's headerSlot) so it's visible on
// every buyer page, not just the one you happen to be on. Replaces the old
// pattern of each page silently polling in isolation with no shared signal.
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Bot, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentStatus } from "@/lib/hooks/use-agent-status";

export function AgentStatusPill({ buyerId }: { buyerId: string | null | undefined }) {
  const { status, label, href } = useAgentStatus(buyerId);

  if (status === "idle" && !buyerId) return null;

  const toneClass =
    status === "needs_input"
      ? "border-modelled-border bg-modelled-bg text-modelled"
      : status === "working"
        ? "border-verified-border bg-verified-bg text-verified"
        : "border-border bg-surface-2 text-muted";

  const Icon = status === "needs_input" ? Sparkles : status === "working" ? CheckCircle2 : Bot;

  const content = (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        toneClass,
        href && "cursor-pointer hover:brightness-95"
      )}
    >
      <AnimatePresence mode="wait">
        {status === "needs_input" ? (
          <motion.span
            key="pulse"
            className="relative flex h-2 w-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-modelled opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-modelled" />
          </motion.span>
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
      </AnimatePresence>
      <span className="hidden sm:inline">{label}</span>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} aria-label={label}>
        {content}
      </Link>
    );
  }
  return content;
}
