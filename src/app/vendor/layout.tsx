"use client";

import { useEffect, useState } from "react";
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
import { getStoredVendorName } from "@/lib/vendor-session";

const openFrontier = capabilityFrontierItems.filter((f) => f.status === "open" || f.status === "vendor_review").length;

const sections: NavSection[] = [
  {
    items: [{ href: "/vendor", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Solution DNA",
    items: [
      { href: "/vendor/onboarding", label: "Submit sources", icon: UploadCloud },
      { href: "/vendor/solution-dna", label: "Review & publish", icon: Dna },
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
  // No real auth session exists yet — this reflects whichever vendor was
  // actually registered via the live agent workflow in this browser
  // (src/lib/vendor-session.ts), instead of the static "CloudNova" demo
  // placeholder, so the shell doesn't look like it ignored a real submission.
  const [vendorName, setVendorName] = useState<string | null>(null);
  useEffect(() => setVendorName(getStoredVendorName()), []);

  return (
    <PortalShell
      role="vendor"
      sections={sections}
      userName={vendorName ? `${vendorName} Admin` : "Not registered yet"}
      userRole="Vendor Admin"
      vendorSubLabel={vendorName ?? "No vendor registered"}
    >
      {children}
    </PortalShell>
  );
}
