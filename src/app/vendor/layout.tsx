"use client";

import {
  LayoutDashboard,
  UploadCloud,
  Dna,
  Users,
  FileSearch,
  CalendarClock,
} from "lucide-react";
import { PortalShell, type NavSection } from "@/components/layout/portal-shell";
import { capabilityFrontierItems } from "@/lib/dummy-data";

const openFrontier = capabilityFrontierItems.filter((f) => f.status === "open" || f.status === "vendor_review").length;

const sections: NavSection[] = [
  {
    items: [{ href: "/vendor", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Solution DNA",
    items: [
      { href: "/vendor/onboarding", label: "Onboarding", icon: UploadCloud },
      { href: "/vendor/sources", label: "Sources", icon: UploadCloud },
      { href: "/vendor/solution-dna", label: "Solution DNA", icon: Dna },
    ],
  },
  {
    title: "Engagement",
    items: [
      { href: "/vendor/buyers", label: "Buyers", icon: Users },
      { href: "/vendor/capability-frontier", label: "Capability Frontier", icon: FileSearch, badge: openFrontier },
      { href: "/vendor/meetings", label: "Meetings", icon: CalendarClock },
    ],
  },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell role="vendor" sections={sections} userName="CloudNova Admin" userRole="Vendor Admin">
      {children}
    </PortalShell>
  );
}
