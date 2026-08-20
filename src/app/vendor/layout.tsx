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
import { getFrontierCountForVendor } from "@/lib/api/vendor-lookup";
import { getStoredVendorId, getStoredVendorName } from "@/lib/vendor-session";

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
      { href: "/vendor/capability-frontier", label: "Capability Frontier", icon: FileSearch },
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
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [openFrontier, setOpenFrontier] = useState<number | undefined>(undefined);

  useEffect(() => {
    const id = getStoredVendorId();
    setVendorName(getStoredVendorName());
    setVendorId(id);
    if (!id) return;
    let cancelled = false;
    async function poll() {
      try {
        const count = await getFrontierCountForVendor(id!);
        if (!cancelled) setOpenFrontier(count);
      } catch {
        // best-effort — badge just stays hidden
      }
    }
    poll();
    const interval = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const scopedSections = sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.href === "/vendor/capability-frontier" ? { ...item, badge: openFrontier || undefined } : item
    ),
  }));

  return (
    <PortalShell
      role="vendor"
      sections={scopedSections}
      userName={vendorName ? `${vendorName} Admin` : "Not registered yet"}
      userRole="Vendor Admin"
      vendorSubLabel={vendorName ?? "No vendor registered"}
      vendorId={vendorId}
    >
      {children}
    </PortalShell>
  );
}
