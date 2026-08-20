"use client";

// The one "the agent is working on this" experience for the whole buyer
// portal. Before this, waiting states were scattered across five different
// visual languages — LoadingState skeletons, ad-hoc `Loader2` spinners with
// slightly different copy, full-page centered spinner blocks, static amber
// "modelled" cards with no animation at all, and the chat panel's own
// bespoke queued-message bubble. This component replaces every one of
// those *except* the chat bubble (which is correctly chat-native and left
// alone) with a single consistent flow: a pulsing status orb, rotating
// status copy so a long wait doesn't feel frozen, an honest elapsed-time
// readout, and — after a short delay — an offer to play a tiny runner game
// instead of staring at a spinner.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Gamepad2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RunnerGame } from "@/components/shared/runner-game";
import { cn } from "@/lib/utils";

const DEFAULT_MESSAGES = [
  "Reading through what you've told us…",
  "Cross-checking against the evidence base…",
  "This step can take a little while — the agent is being thorough, not stuck…",
  "Still working…",
];

// Below this, showing "play a game" would just be visual noise for a wait
// that's about to resolve on its own anyway.
const GAME_OFFER_THRESHOLD_MS = 7000;

function useElapsedMs() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(id);
  }, []);
  return elapsed;
}

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export function AgentWaitingState({
  title,
  description,
  messages = DEFAULT_MESSAGES,
  variant = "card",
  className,
}: {
  title: string;
  description?: React.ReactNode;
  /** Rotates through these underneath the title, ~4s apart, to keep a long wait from feeling frozen. */
  messages?: string[];
  /** "fullpage" for a page that has nothing else to show yet; "card" to sit inline among other content. */
  variant?: "fullpage" | "card";
  className?: string;
}) {
  const elapsed = useElapsedMs();
  const [messageIndex, setMessageIndex] = useState(0);
  const [gameOpen, setGameOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setMessageIndex((i) => (i + 1) % messages.length), 4000);
    return () => clearInterval(id);
  }, [messages.length]);

  const canOfferGame = elapsed >= GAME_OFFER_THRESHOLD_MS;

  return (
    <Card
      className={cn(
        "border-border bg-surface",
        variant === "fullpage" && "mx-auto max-w-xl border-none bg-transparent shadow-none",
        className
      )}
    >
      <CardContent className={cn("flex flex-col items-center gap-4 text-center", variant === "fullpage" ? "py-10" : "py-8")}>
        <div className="relative flex h-14 w-14 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 opacity-20"
            animate={{ scale: [1, 1.5, 1], opacity: [0.25, 0, 0.25] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-md shadow-brand-900/20">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <div>
          <p className="text-base font-semibold text-foreground">{title}</p>
          {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
        </div>

        <div className="h-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="text-xs text-subtle"
            >
              {messages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <p className="text-[11px] tabular-nums text-subtle">Working for {formatElapsed(elapsed)}</p>

        {canOfferGame && !gameOpen && (
          <Button variant="subtle" size="sm" onClick={() => setGameOpen(true)}>
            <Gamepad2 className="h-3.5 w-3.5" /> Play while you wait
          </Button>
        )}

        <AnimatePresence>
          {gameOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full overflow-hidden"
            >
              <RunnerGame />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
