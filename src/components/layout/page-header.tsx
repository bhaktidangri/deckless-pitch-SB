"use client";

import { motion } from "motion/react";
import { BackButton } from "@/components/layout/back-button";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  backHref,
  hideBack,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  /** Navigate to a fixed route instead of the browser's previous entry. */
  backHref?: string;
  /** Opt out of the back button for screens with no logical "back" (e.g. a root dashboard reached only by nav). */
  hideBack?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn("mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between", className)}
    >
      <div>
        {!hideBack && <BackButton href={backHref} className="mb-3" />}
        {eyebrow && (
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-gradient-to-r from-brand-50 to-accent-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:border-brand-800 dark:from-brand-950/50 dark:to-accent-500/10 dark:text-brand-300">
            {eyebrow}
          </span>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </motion.div>
  );
}
