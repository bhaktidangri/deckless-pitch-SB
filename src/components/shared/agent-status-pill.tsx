"use client";

// The one persistent "where are we" indicator for the buyer journey — lives
// in the portal header (via PortalShell's headerSlot) so it's visible on
// every buyer page, not just the one you happen to be on. Replaces the old
// pattern of each page silently polling in isolation with no shared signal.
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Bot, CheckCircle2, Gamepad2, PartyPopper, Sparkles } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { RunnerGame } from "@/components/shared/runner-game";
import { cn } from "@/lib/utils";
import { useAgentStatus } from "@/lib/hooks/use-agent-status";
import { useElapsedSince, formatElapsed } from "@/lib/hooks/use-elapsed-since";

export function AgentStatusPill({ buyerId }: { buyerId: string | null | undefined }) {
  const { status, label, href, startedAt } = useAgentStatus(buyerId);
  const [gameOpen, setGameOpen] = useState(false);
  // Ticks even while status isn't "working" — cheap, and avoids the hook
  // being called conditionally across renders.
  const elapsed = useElapsedSince(startedAt);

  if (status === "idle" && !buyerId) return null;

  const toneClass =
    status === "needs_input"
      ? "border-modelled-border bg-modelled-bg text-modelled"
      : status === "completed"
        ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300"
        : status === "working"
          ? "border-verified-border bg-verified-bg text-verified"
          : "border-border bg-surface-2 text-muted";

  const Icon = status === "needs_input" ? Sparkles : status === "completed" ? PartyPopper : status === "working" ? CheckCircle2 : Bot;

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
      {/* Real elapsed time, not "since this component mounted" — stays
          accurate whichever page you're on and however many times you've
          navigated away from and back to it mid-run. */}
      {status === "working" && startedAt && (
        <span className="hidden tabular-nums opacity-70 md:inline">· {formatElapsed(elapsed)}</span>
      )}
    </motion.div>
  );

  const wrapped = href ? (
    <Link href={href} aria-label={label}>
      {content}
    </Link>
  ) : (
    content
  );

  return (
    <div className="flex items-center gap-1.5">
      {wrapped}
      {/* The agent keeps running server-side no matter what page you're on
          — this just gives you something to do with the 2-3+ minutes,
          reachable from anywhere instead of only the one screen that
          triggered the run. */}
      {status === "working" && (
        <button
          type="button"
          onClick={() => setGameOpen(true)}
          aria-label="Play while you wait"
          title="Play while you wait"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-2 text-muted transition-colors hover:text-foreground"
        >
          <Gamepad2 className="h-3.5 w-3.5" />
        </button>
      )}
      <Drawer
        open={gameOpen}
        onClose={() => setGameOpen(false)}
        title="Play while you wait"
        description="Your agent is still working — it keeps running in the background no matter where you are in the app."
        widthClassName="w-full max-w-lg"
      >
        <div className="p-5">
          <RunnerGame compact />
        </div>
      </Drawer>
    </div>
  );
}
