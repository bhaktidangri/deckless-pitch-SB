"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function NavLink({
  href,
  label,
  icon: Icon,
  badge,
  onClick,
  exact,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  onClick?: () => void;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "text-brand-700 dark:text-brand-300" : "text-muted hover:bg-surface-2 hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId="active-nav-pill"
          className="absolute inset-0 rounded-lg bg-brand-50 dark:bg-brand-950/50"
          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
        />
      )}
      <Icon className="relative z-10 h-4 w-4 shrink-0" />
      <span className="relative z-10 flex-1 truncate">{label}</span>
      {typeof badge === "number" && badge > 0 && (
        <span className="relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-escalated px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
