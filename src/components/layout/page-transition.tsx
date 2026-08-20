"use client";

// Route-to-route motion for the buyer portal's <main> content — previously
// every navigation just hard-cut between pages with no transition at all,
// which is part of why the app read as "admin panel" rather than a
// designed product. Keyed on pathname so AnimatePresence treats each route
// as a distinct element and animates the swap.
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
