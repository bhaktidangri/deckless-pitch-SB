"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, FileCheck2, ShieldCheck, Sparkles, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { AuditTimeline } from "@/components/shared/audit-timeline";
import { auditEvents, dashboardStats, platformActivity, recentOrganizations } from "@/lib/dummy-data";
import { formatRelativeTime } from "@/lib/utils";

export default function AdminDashboardPage() {
  const stats = dashboardStats.admin;

  return (
    <div>
      <PageHeader
        eyebrow="Platform Overview"
        title="Admin Dashboard"
        description="Cross-organization health: onboarding, grounded answer rate, and audit coverage."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Organizations" value={String(stats.totalOrganizations)} icon={Building2} />
        <StatCard label="Active vendors" value={String(stats.activeVendors)} icon={ShieldCheck} tone="brand" />
        <StatCard label="Active buyers" value={String(stats.activeBuyers)} icon={Users} tone="accent" />
        <StatCard label="Solution models" value={String(stats.totalSolutionModels)} icon={Sparkles} tone="modelled" />
        <StatCard label="Grounded answer rate" value={`${stats.groundedAnswerRate}%`} icon={FileCheck2} tone="verified" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Platform activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformActivity} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "var(--foreground)",
                    }}
                  />
                  <Bar dataKey="solutions" fill="var(--brand-500)" radius={[4, 4, 0, 0]} name="Solution models" />
                  <Bar dataKey="questions" fill="var(--accent-400)" radius={[4, 4, 0, 0]} name="Questions resolved" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-center gap-5 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" /> Solution models generated</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent-400" /> Questions resolved</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent organizations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-2">
            {recentOrganizations.map((org) => (
              <div key={org.id} className="flex items-center gap-3 py-2">
                <Avatar name={org.name} size="sm" color={org.type === "vendor" ? "brand" : "accent"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{org.name}</p>
                  <p className="text-xs text-muted capitalize">{org.type} &middot; {formatRelativeTime(org.joinedAt)}</p>
                </div>
                <Badge variant={org.status === "verified" ? "verified" : "modelled"} size="sm">{org.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Platform-wide agent activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <AuditTimeline events={auditEvents} />
        </CardContent>
      </Card>
    </div>
  );
}
