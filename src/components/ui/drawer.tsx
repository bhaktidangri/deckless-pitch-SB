"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// `position: fixed` resolves against the nearest ancestor with an active
// transform/filter/backdrop-filter/perspective/will-change, not always the
// viewport — a real CSS containing-block rule, not a bug in the fixed
// elements below. Both Drawer and Modal render `fixed inset-0` overlays, so
// if either ever gets triggered from inside an element with one of those
// properties (e.g. a sticky header using `backdrop-blur`, as
// PortalShell's does), the whole overlay collapses into that ancestor's box
// instead of covering the viewport — pinned near it and clipped/overflowing
// instead of centered full-screen, with the backdrop dimming only that tiny
// box instead of the page. Portaling to document.body sidesteps this
// regardless of where the trigger happens to live in the tree.
function usePortalReady() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => setReady(true), []);
  return ready;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  side = "right",
  widthClassName = "w-full max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  side?: "right" | "left";
  widthClassName?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const portalReady = usePortalReady();
  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ x: side === "right" ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "right" ? "100%" : "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "fixed top-0 z-50 flex h-full flex-col border-border bg-surface shadow-2xl",
              side === "right" ? "right-0 border-l" : "left-0 border-r",
              widthClassName
            )}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                <div>
                  {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
                  {description && <p className="mt-1 text-sm text-muted">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
  return portalReady ? createPortal(content, document.body) : null;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  widthClassName = "w-full max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const portalReady = usePortalReady();
  const content = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn("relative z-10 flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-2xl", widthClassName)}
          >
            {title && (
              <div className="mb-4 flex shrink-0 items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {/* min-h-0 is required for a flex child to actually shrink and
                let its own overflow-y-auto content scroll, instead of the
                whole card growing past max-h and scrolling as one block —
                which used to carry the search input/header out of view
                along with the results once the list got tall. */}
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
  return portalReady ? createPortal(content, document.body) : null;
}
