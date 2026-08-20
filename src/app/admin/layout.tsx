"use client";

import { LayoutDashboard, Building2, Users, FileClock, Settings } from "lucide-react";
import { PortalShell, type NavSection } from "@/components/layout/portal-shell";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { useRequireAdmin } from "@/lib/hooks/use-require-admin";

const sections: NavSection[] = [
  {
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Management",
    items: [
      { href: "/admin/vendors", label: "Vendors", icon: Building2 },
      { href: "/admin/buyers", label: "Buyers", icon: Users },
    ],
  },
  {
    title: "Governance",
    items: [
      { href: "/admin/audit", label: "Audit & Evidence", icon: FileClock },
      { href: "/admin/platform", label: "Platform settings", icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Being logged in isn't enough here — the email must also be on
  // admin_allowlist (verified server-side by resolve-account-session via
  // useRequireAdmin), unlike buyer/vendor which only need any real session.
  const { ready } = useRequireAdmin();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <AgentWaitingState variant="fullpage" title="Checking your access" description="One moment…" />
      </div>
    );
  }

  return (
    <PortalShell role="admin" sections={sections} userName="Platform Admin" userRole="Super Admin">
      {children}
    </PortalShell>
  );
}
