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
  return (
    <PortalShell role="buyer" sections={sections} userName="Priya Sharma" userRole="VP of Technology">
      {children}
    </PortalShell>
  );
}
