"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "@/components/layout/nav-link";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Drawer } from "@/components/ui/drawer";
import { getSupabaseClient } from "@/lib/supabase-client";
import { clearBuyerSession } from "@/lib/buyer-session";
import { clearStoredVendorId } from "@/lib/vendor-session";

export interface NavSection {
  title?: string;
  items: { href: string; label: string; icon: LucideIcon; badge?: number; exact?: boolean }[];
}

export function PortalShell({
  role,
  sections,
  userName,
  userRole,
  vendorSubLabel,
  buyerSubLabel,
  buyerId,
  vendorId,
  headerSlot,
  children,
}: {
  role: "vendor" | "buyer" | "admin";
  sections: NavSection[];
  userName: string;
  userRole: string;
  /** Real registered vendor name, once known — overrides the role switcher's "CloudNova" demo placeholder. */
  vendorSubLabel?: string;
  /** Real signed-in buyer's company name, once known — overrides the role switcher's "Meridian Retail Group" demo placeholder. */
  buyerSubLabel?: string;
  /** Real buyer/vendor id, once known — lets NotificationsMenu fetch role-scoped real notifications instead of a static fake list. */
  buyerId?: string | null;
  vendorId?: string | null;
  /** Optional extra content rendered in the sticky header, left of notifications — e.g. a cross-page status indicator. */
  headerSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await getSupabaseClient().auth.signOut();
    } catch {
      // best-effort — clear local session state regardless
    }
    clearBuyerSession();
    clearStoredVendorId();
    router.push("/login");
  }

  const navContent = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold tracking-tight text-foreground">Deck-less Pitch</span>
      </div>

      <div className="px-3">
        <RoleSwitcher current={role} vendorSubLabel={vendorSubLabel} buyerSubLabel={buyerSubLabel} />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {sections.map((section, i) => (
          <div key={i}>
            {section.title && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-subtle">{section.title}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} {...item} onClick={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-xl p-2">
          <Avatar name={userName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{userName}</p>
            <p className="truncate text-xs text-muted">{userRole}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-escalated disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 shrink-0 border-r border-border bg-surface lg:block">
        {navContent()}
      </aside>

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} side="left" widthClassName="w-72">
        {navContent(() => setMobileOpen(false))}
      </Drawer>

      <div className="flex min-h-screen w-full flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-2 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link href="/" className="text-sm font-semibold text-foreground lg:hidden">
            Deck-less Pitch
          </Link>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {headerSlot}
            <NotificationsMenu role={role} buyerId={buyerId} vendorId={vendorId} />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
