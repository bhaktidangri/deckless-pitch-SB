"use client";

// A horizontal stepper showing where the buyer actually is in the journey
// (Discover → Vendor → Solution → Scenarios → Handoff), computed from real
// Supabase state rather than a hardcoded "step 3 of 5" — the dashboard is
// the one place a buyer should be able to see the whole flow at a glance
// instead of piecing it together from five separate nav items.
import Link from "next/link";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PipelineStage {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  done: boolean;
}

export function PipelineTracker({ stages }: { stages: PipelineStage[] }) {
  // The current stage is the first one not yet done — everything before it
  // is complete, everything after is upcoming.
  const currentIndex = stages.findIndex((s) => !s.done);
  const activeIndex = currentIndex === -1 ? stages.length - 1 : currentIndex;

  return (
    <div className="flex items-start">
      {stages.map((stage, i) => {
        const Icon = stage.icon;
        const isDone = stage.done;
        const isActive = i === activeIndex && !isDone;
        return (
          <div key={stage.key} className="flex flex-1 items-start last:flex-none">
            <Link href={stage.href} className="group flex flex-col items-center gap-2 text-center">
              <motion.div
                initial={false}
                animate={isActive ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={isActive ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isDone
                    ? "border-verified bg-verified text-white"
                    : isActive
                      ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300"
                      : "border-border bg-surface text-subtle group-hover:border-border-strong"
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </motion.div>
              <span
                className={cn(
                  "max-w-[6.5rem] text-xs font-medium",
                  isDone || isActive ? "text-foreground" : "text-subtle"
                )}
              >
                {stage.label}
              </span>
            </Link>
            {i < stages.length - 1 && (
              <div className={cn("mt-5 h-0.5 flex-1 rounded-full", isDone ? "bg-verified" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
