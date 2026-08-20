"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronsUpDown, Building2, ShoppingBag, ShieldCheck, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const roles = [
  { key: "vendor", label: "Vendor Portal", sub: "CloudNova", href: "/vendor", icon: Building2 },
  { key: "buyer", label: "Buyer Portal", sub: "Meridian Retail Group", href: "/buyer", icon: ShoppingBag },
  { key: "admin", label: "Platform Admin", sub: "Deck-less Pitch", href: "/admin", icon: ShieldCheck },
] as const;

export function RoleSwitcher({
  current,
  vendorSubLabel,
  buyerSubLabel,
}: {
  current: "vendor" | "buyer" | "admin";
  /** Overrides the vendor row's demo "CloudNova" sub-label with the real registered vendor, once known. */
  vendorSubLabel?: string;
  /** Overrides the buyer row's demo "Meridian Retail Group" sub-label with the real signed-in buyer, once known. */
  buyerSubLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = roles.find((r) => r.key === current)!;
  const activeSub =
    current === "vendor" && vendorSubLabel
      ? vendorSubLabel
      : current === "buyer" && buyerSubLabel
        ? buyerSubLabel
        : active.sub;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface-2 p-2.5 text-left transition-colors hover:bg-surface-hover"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-white">
          <active.icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{active.label}</p>
          <p className="truncate text-xs text-muted">{activeSub}</p>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-subtle" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
          >
            <p className="px-3 pt-2.5 text-[11px] font-medium uppercase tracking-wide text-subtle">Switch demo view</p>
            <div className="p-1.5">
              {roles.map((r) => (
                <Link
                  key={r.key}
                  href={r.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-surface-2",
                    r.key === current && "bg-brand-50 dark:bg-brand-950/40"
                  )}
                >
                  <r.icon className="h-4 w-4 text-muted" />
                  <span className="flex-1 text-foreground">{r.label}</span>
                  {r.key === current && <Check className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
