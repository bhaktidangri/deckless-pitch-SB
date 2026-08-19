"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = "brand",
  className,
  index = 0,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  tone?: "brand" | "verified" | "modelled" | "escalated" | "accent";
  className?: string;
  /** Position in a grid of stat cards — staggers the entrance animation so a row doesn't pop in all at once. */
  index?: number;
}) {
  const toneClass: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600 ring-brand-100 dark:bg-brand-950/40 dark:text-brand-300 dark:ring-brand-900",
    verified: "bg-verified-bg text-verified ring-verified-border",
    modelled: "bg-modelled-bg text-modelled ring-modelled-border",
    escalated: "bg-escalated-bg text-escalated ring-escalated-border",
    accent: "bg-accent-400/15 text-accent-600 ring-accent-400/20 dark:text-accent-400",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      className={cn(
        "group rounded-2xl border border-border bg-surface p-5 shadow-sm shadow-black/[0.02] transition-shadow hover:shadow-md hover:shadow-black/[0.04] dark:shadow-black/20",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-110", toneClass[tone])}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && <span className="text-xs font-medium text-verified">{trend}</span>}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </motion.div>
  );
}
