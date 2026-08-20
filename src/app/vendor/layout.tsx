"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Dna,
  Users,
  FileSearch,
  CalendarClock,
} from "lucide-react";
import { PortalShell, type NavSection } from "@/components/layout/portal-shell";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { getFrontierCountForVendor } from "@/lib/api/vendor-lookup";
import { getStoredVendorId, getStoredVendorName, onVendorSessionChanged } from "@/lib/vendor-session";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { UserCircle } from "lucide-react";

const sections: NavSection[] = [
  {
    items: [{ href: "/vendor", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Solution DNA",
    items: [{ href: "/vendor/solution-dna", label: "Review & publish", icon: Dna }],
  },
  {
    title: "Engagement",
    items: [
      { href: "/vendor/buyers", label: "Buyers", icon: Users },
      { href: "/vendor/capability-frontier", label: "Capability Frontier", icon: FileSearch },
      { href: "/vendor/meetings", label: "Meetings", icon: CalendarClock },
    ],
  },
  {
    title: "Account",
    items: [{ href: "/vendor/profile", label: "Profile", icon: UserCircle }],
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
  const [realtimeBump, setRealtimeBump] = useState(0);
  const { ready } = useRequireAuth();

  useRealtimeRefresh(
    vendorId ? [{ table: "capability_frontier", filter: `vendor_id=eq.${vendorId}` }] : [],
    () => setRealtimeBump((n) => n + 1),
    [vendorId]
  );

  // Re-reads localStorage whenever another component on this page (e.g. the
  // profile or solution-dna page linking/loading a vendor after this layout
  // already mounted) writes a new vendor id/name, so the sidebar doesn't get
  // stuck showing "No vendor registered" once one actually loads.
  useEffect(() => {
    const sync = () => {
      setVendorName(getStoredVendorName());
      setVendorId(getStoredVendorId());
    };
    sync();
    return onVendorSessionChanged(sync);
  }, []);

  useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;
    async function poll() {
      try {
        const count = await getFrontierCountForVendor(vendorId!);
        if (!cancelled) setOpenFrontier(count);
      } catch {
        // best-effort — badge just stays hidden
      }
    }
    poll();
    const interval = setInterval(poll, 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [vendorId, realtimeBump]);

  const scopedSections = sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.href === "/vendor/capability-frontier" ? { ...item, badge: openFrontier || undefined } : item
    ),
  }));

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <AgentWaitingState variant="fullpage" title="Checking your session" description="One moment…" />
      </div>
    );
  }

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
