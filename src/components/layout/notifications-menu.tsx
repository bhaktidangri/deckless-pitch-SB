"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CircleAlert, MessageSquare, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const notifications = [
  {
    icon: CircleAlert,
    tone: "escalated",
    title: "New Capability Frontier item",
    detail: "Meridian Retail Group needs confirmation on zero-downtime migration.",
    time: "12m ago",
  },
  {
    icon: MessageSquare,
    tone: "brand",
    title: "Buyer message",
    detail: "Priya Sharma asked about PCI-DSS compliance.",
    time: "1h ago",
  },
  {
    icon: RefreshCw,
    tone: "verified",
    title: "Solution model updated",
    detail: "Kestrel Logistics solution recalculated after requirement change.",
    time: "3h ago",
  },
];

const toneClass: Record<string, string> = {
  escalated: "bg-escalated-bg text-escalated",
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300",
  verified: "bg-verified-bg text-verified",
};

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-escalated ring-2 ring-surface" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n, i) => (
                <div key={i} className="flex gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-surface-2">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", toneClass[n.tone])}>
                    <n.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{n.detail}</p>
                    <p className="mt-1 text-[11px] text-subtle">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
