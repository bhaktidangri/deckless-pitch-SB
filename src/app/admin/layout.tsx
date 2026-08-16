"use client";

import { LayoutDashboard, Building2, Users, FileClock, Settings } from "lucide-react";
import { PortalShell, type NavSection } from "@/components/layout/portal-shell";

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
  return (
    <PortalShell role="admin" sections={sections} userName="Platform Admin" userRole="Super Admin">
      {children}
    </PortalShell>
  );
}
