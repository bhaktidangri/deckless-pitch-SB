"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, FileCheck2, ShieldCheck, Sparkles, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { AuditTimeline } from "@/components/shared/audit-timeline";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import {
  getPlatformStats,
  getPlatformActivitySeries,
  getRecentOrganizations,
  getAuditEvents,
  getBuyerFunnelStages,
  type PlatformStats,
  type PlatformActivityWeek,
  type OrganizationRow,
  type BuyerFunnelStage,
} from "@/lib/api/admin-lookup";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { formatRelativeTime } from "@/lib/utils";
import type { AuditEvent } from "@/lib/types";

const FUNNEL_COLORS = ["var(--brand-600)", "var(--brand-500)", "var(--brand-400)", "var(--brand-300)", "var(--brand-200)"];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activity, setActivity] = useState<PlatformActivityWeek[]>([]);
  const [orgs, setOrgs] = useState<OrganizationRow[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [funnel, setFunnel] = useState<BuyerFunnelStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeBump, setRealtimeBump] = useState(0);

  useRealtimeRefresh(
    [
      { table: "organizations" },
      { table: "vendors" },
      { table: "buyers" },
      { table: "solution_models" },
      { table: "capability_frontier" },
      { table: "audit_events" },
    ],
    () => setRealtimeBump((n) => n + 1),
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, a, o, e, f] = await Promise.all([
          getPlatformStats(),
          getPlatformActivitySeries(6),
          getRecentOrganizations(6),
          getAuditEvents(10),
          getBuyerFunnelStages(),
        ]);
        if (cancelled) return;
        setStats(s);
        setActivity(a);
        setOrgs(o);
        setEvents(e);
        setFunnel(f);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [realtimeBump]);

  if (loading || !stats) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <AgentWaitingState variant="fullpage" title="Loading platform overview" description="Pulling live organization, vendor, and buyer counts." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Platform Overview"
        title="Admin Dashboard"
        description="Cross-organization health: onboarding, grounded answer rate, and audit coverage."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Organizations" value={String(stats.totalOrganizations)} icon={Building2} index={0} />
        <StatCard label="Active vendors" value={String(stats.activeVendors)} icon={ShieldCheck} tone="brand" index={1} />
        <StatCard label="Active buyers" value={String(stats.activeBuyers)} icon={Users} tone="accent" index={2} />
        <StatCard label="Solution models" value={String(stats.totalSolutionModels)} icon={Sparkles} tone="modelled" index={3} />
        <StatCard
          label="Grounded answer rate"
          value={stats.groundedAnswerRate != null ? `${stats.groundedAnswerRate}%` : "—"}
          icon={FileCheck2}
          tone="verified"
          index={4}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Platform activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
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
                  <Bar dataKey="questions" fill="var(--accent-400)" radius={[4, 4, 0, 0]} name="Frontier questions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-center gap-5 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" /> Solution models generated</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent-400" /> Frontier questions raised</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent organizations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-2">
            {orgs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No organizations yet.</p>
            ) : (
              orgs.map((org) => (
                <div key={org.id} className="flex items-center gap-3 py-2">
                  <Avatar name={org.name} size="sm" color={org.type === "vendor" ? "brand" : "accent"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{org.name}</p>
                    <p className="text-xs text-muted capitalize">{org.type} &middot; {formatRelativeTime(org.createdAt)}</p>
                  </div>
                  <Badge variant="modelled" size="sm" className="capitalize">{org.type}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {funnel.length > 0 && funnel[0].count > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Buyer funnel</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    tick={{ fill: "var(--foreground)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    formatter={(value) => {
                      const n = typeof value === "number" ? value : Number(value ?? 0);
                      const pct = funnel[0].count > 0 ? ` (${Math.round((n / funnel[0].count) * 100)}%)` : "";
                      return [`${n} buyer${n === 1 ? "" : "s"}${pct}`, "Reached this stage"];
                    }}
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "var(--foreground)",
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {funnel.map((stage, i) => (
                      <Cell key={stage.stage} fill={FUNNEL_COLORS[i] ?? FUNNEL_COLORS[FUNNEL_COLORS.length - 1]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-center text-xs text-subtle">
              Every buyer who has ever submitted a discovery request, by how far they got — live counts, not a fixed conversion model.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Platform-wide agent activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {events.length > 0 ? <AuditTimeline events={events} /> : <p className="py-8 text-center text-sm text-muted">No agent activity recorded yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
