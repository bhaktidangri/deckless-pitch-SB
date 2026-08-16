"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Slide {
  label: string;
  title: string;
  content: React.ReactNode;
}

export function PresentationDeck({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  function go(newIndex: number) {
    if (newIndex < 0 || newIndex >= slides.length) return;
    setDirection(newIndex > index ? 1 : -1);
    setIndex(newIndex);
  }

  const slide = slides[index];

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1">
        {slides.map((s, i) => (
          <button
            key={s.label}
            onClick={() => go(i)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              i === index ? "bg-brand-600 text-white" : "bg-surface-2 text-muted hover:text-foreground"
            )}
          >
            {i + 1}. {s.label}
          </button>
        ))}
      </div>

      <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-border bg-surface">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="p-6 sm:p-10"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </p>
            <h2 className="text-balance mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{slide.title}</h2>
            <div className="mt-6">{slide.content}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-brand-600" : "w-1.5 bg-surface-2")}
            />
          ))}
        </div>
        <button
          onClick={() => go(index + 1)}
          disabled={index === slides.length - 1}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-40"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
