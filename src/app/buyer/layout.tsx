"use client";

import { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Search,
  ClipboardList,
  Store,
  Sparkles,
  SlidersHorizontal,
  MessageSquareText,
  CalendarClock,
  UserCircle,
} from "lucide-react";
import { PortalShell, type NavSection } from "@/components/layout/portal-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { AgentStatusPill } from "@/components/shared/agent-status-pill";
import { GlobalCapabilitySearch } from "@/components/shared/global-capability-search";
import { getBuyer } from "@/lib/api/buyer-lookup";
import { linkBuyerAccount } from "@/lib/api/account";
import { useBuyerSession } from "@/lib/hooks/use-buyer-session";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";

const sections: NavSection[] = [
  {
    items: [{ href: "/buyer", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Discovery",
    items: [
      { href: "/buyer/discover", label: "Discover", icon: Search },
      { href: "/buyer/requirements", label: "Requirements", icon: ClipboardList },
      { href: "/buyer/vendors", label: "Vendors", icon: Store },
    ],
  },
  {
    title: "Your solution",
    items: [
      { href: "/buyer/solution", label: "Solution workspace", icon: Sparkles },
      { href: "/buyer/scenarios", label: "Scenarios", icon: SlidersHorizontal },
      { href: "/buyer/chat", label: "Ask AI", icon: MessageSquareText },
    ],
  },
  {
    title: "Closure",
    items: [{ href: "/buyer/handoff", label: "Expert handoff", icon: CalendarClock }],
  },
  {
    title: "Account",
    items: [{ href: "/buyer/profile", label: "Profile", icon: UserCircle }],
  },
];

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  // Mirrors vendor/layout.tsx: no real auth session exists yet, so this
  // reflects whichever buyer actually submitted a discovery form in this
  // browser (src/lib/buyer-session.ts) instead of a static demo placeholder.
  // useBuyerSession (not a raw getStoredX() read) because this layout never
  // unmounts while the buyer navigates the portal — it needs to notice
  // buyerId/companyName appearing mid-session, not just at first paint.
  const { companyName, buyerId } = useBuyerSession();
  const { ready } = useRequireAuth();

  // A buyer loaded from a locally-stored buyerId isn't necessarily linked to
  // *this* authenticated session's email yet (e.g. buyerId discovered via
  // the discovery-form poll before any login happened) — every
  // buyer-authenticated edge function (record-buyer-outreach,
  // buyer-schedule-meeting, update-buyer-profile, ...) resolves "which
  // buyer" purely from the session's own email, so without this they 403
  // even though the portal clearly has a buyer loaded. Mirrors the same fix
  // already applied to the vendor side in vendor/profile/page.tsx, just
  // hoisted to the layout so it covers every buyer page, not one form.
  const linkAttemptedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !buyerId || linkAttemptedRef.current === buyerId) return;
    linkAttemptedRef.current = buyerId;
    getBuyer(buyerId)
      .then((buyer) => {
        if (buyer && !buyer.email) return linkBuyerAccount(buyerId);
      })
      .catch(() => {
        // best-effort — a failed check here just means the next mount tries again
      });
  }, [ready, buyerId]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <AgentWaitingState variant="fullpage" title="Checking your session" description="One moment…" />
      </div>
    );
  }

  return (
    <PortalShell
      role="buyer"
      sections={sections}
      userName={companyName ?? "Not started yet"}
      userRole="Buyer"
      buyerSubLabel={companyName ?? undefined}
      buyerId={buyerId}
      headerSlot={
        <>
          <GlobalCapabilitySearch />
          <AgentStatusPill buyerId={buyerId} />
        </>
      }
    >
      <PageTransition>{children}</PageTransition>
    </PortalShell>
  );
}
