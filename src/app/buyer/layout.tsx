"use client";

import {
  LayoutDashboard,
  Search,
  ClipboardList,
  Store,
  Sparkles,
  SlidersHorizontal,
  MessageSquareText,
  CalendarClock,
} from "lucide-react";
import { PortalShell, type NavSection } from "@/components/layout/portal-shell";
import { AgentStatusPill } from "@/components/shared/agent-status-pill";
import { getStoredBuyerId, getStoredCompanyName } from "@/lib/buyer-session";

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
];

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  // Mirrors vendor/layout.tsx: no real auth session exists yet, so this
  // reflects whichever buyer actually submitted a discovery form in this
  // browser (src/lib/buyer-session.ts) instead of a static demo placeholder.
  // Read directly in the render body (not useState+useEffect) — localStorage
  // is available synchronously on the client and this avoids a
  // set-state-in-effect render flash on first paint.
  const companyName = getStoredCompanyName();
  const buyerId = getStoredBuyerId();

  return (
    <PortalShell
      role="buyer"
      sections={sections}
      userName={companyName ?? "Not started yet"}
      userRole="Buyer"
      headerSlot={<AgentStatusPill buyerId={buyerId} />}
    >
      {children}
    </PortalShell>
  );
}
