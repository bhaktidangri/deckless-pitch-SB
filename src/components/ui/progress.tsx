"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export function Progress({
  value,
  className,
  barClassName,
  size = "md",
}: {
  value: number;
  className?: string;
  barClassName?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-surface-2",
        size === "sm" ? "h-1.5" : "h-2.5",
        className
      )}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={cn("h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500", barClassName)}
      />
    </div>
  );
}
