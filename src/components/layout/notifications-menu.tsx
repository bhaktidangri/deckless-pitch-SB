"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CircleAlert, MessageSquare, RefreshCw, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { getBuyerNotifications, getVendorNotifications, getAdminNotifications, type NotificationItem } from "@/lib/api/notifications";

const toneClass: Record<string, string> = {
  escalated: "bg-escalated-bg text-escalated",
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300",
  verified: "bg-verified-bg text-verified",
  modelled: "bg-modelled-bg text-modelled",
};

const toneIcon: Record<string, typeof CircleAlert> = {
  escalated: CircleAlert,
  brand: MessageSquare,
  verified: RefreshCw,
  modelled: Sparkles,
};

export function NotificationsMenu({
  role,
  buyerId,
  vendorId,
}: {
  role: "vendor" | "buyer" | "admin";
  buyerId?: string | null;
  vendorId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let result: NotificationItem[] = [];
        if (role === "buyer" && buyerId) result = await getBuyerNotifications(buyerId);
        else if (role === "vendor" && vendorId) result = await getVendorNotifications(vendorId);
        else if (role === "admin") result = await getAdminNotifications();
        if (!cancelled) setItems(result);
      } catch {
        // best-effort — menu just shows empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [role, buyerId, vendorId]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {items.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-escalated ring-2 ring-surface" />}
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
              {loading ? (
                <p className="px-4 py-6 text-center text-xs text-subtle">Loading…</p>
              ) : items.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-subtle">
                  {buyerId || vendorId || role === "admin" ? "Nothing new right now." : "Nothing to show yet."}
                </p>
              ) : (
                items.map((n) => {
                  const Icon = toneIcon[n.tone] ?? Bell;
                  return (
                    <div key={n.id} className="flex gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-surface-2">
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", toneClass[n.tone])}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">{n.detail}</p>
                        <p className="mt-1 text-[11px] text-subtle">{formatRelativeTime(n.time)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
