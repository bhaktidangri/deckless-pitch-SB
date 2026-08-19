"use client";

import Link from "next/link";
import { ArrowUpRight, CircleAlert, Clock, FileSearch, Sparkles, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { AuditTimeline } from "@/components/shared/audit-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { auditEvents, capabilityFrontierItems, dashboardStats, otherBuyerEngagements, primaryVendor } from "@/lib/dummy-data";
import { cn, formatRelativeTime } from "@/lib/utils";

export default function VendorDashboardPage() {
  const stats = dashboardStats.vendor;
  const openFrontier = capabilityFrontierItems.filter((f) => f.status === "open");

  return (
    <div>
      <PageHeader
        eyebrow={primaryVendor.name}
        title="Vendor Dashboard"
        description="Track buyer engagement, Solution DNA health, and unresolved requirements at a glance."
        actions={
          <Link href="/vendor/solution-dna" className={cn(buttonVariants({ variant: "primary" }))}>
            Review Solution DNA <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Active buyers" value={String(stats.activeBuyers)} icon={Users} trend="+3 this week" />
        <StatCard label="Solutions generated" value={String(stats.solutionsGenerated)} icon={Sparkles} tone="accent" />
        <StatCard label="Open frontier items" value={String(stats.openFrontierItems)} icon={FileSearch} tone="escalated" />
        <StatCard label="Avg. requirement fit" value={`${stats.avgFitScore}%`} icon={TrendingUp} tone="verified" />
        <StatCard label="Presales hours saved" value={String(stats.presalesHoursSaved)} icon={Clock} tone="modelled" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Active buyer engagements</CardTitle>
            <Link href="/vendor/buyers" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              View all
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="divide-y divide-border">
              <EngagementRow name="Meridian Retail Group" industry="Retail" stage="Solution Workspace" fitScore={92} frontierOpen={2} lastActive="2026-08-16T07:40:00Z" />
              {otherBuyerEngagements.map((e) => (
                <EngagementRow key={e.id} name={e.buyerName} industry={e.industry} stage={e.stage} fitScore={e.fitScore} frontierOpen={e.frontierOpen} lastActive={e.lastActive} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <AuditTimeline events={auditEvents.slice(0, 5)} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CircleAlert className="h-4 w-4 text-escalated" /> Needs your input
          </CardTitle>
          <Link href="/vendor/capability-frontier" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
            View Capability Frontier
          </Link>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
          {openFrontier.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{item.question}</p>
                <Badge variant="escalated" size="sm">Open</Badge>
              </div>
              <p className="mt-1.5 text-xs text-muted">{item.buyerName} &middot; {formatRelativeTime(item.createdAt)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EngagementRow({ name, industry, stage, fitScore, frontierOpen, lastActive }: { name: string; industry: string; stage: string; fitScore: number; frontierOpen: number; lastActive: string }) {
  return (
    <Link href="/vendor/buyers/b-meridian" className="flex items-center justify-between gap-3 py-3.5 transition-colors hover:bg-surface-2 -mx-1 px-1 rounded-lg">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted">{industry} &middot; {stage}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {frontierOpen > 0 && (
          <span className="flex items-center gap-1 text-xs text-escalated">
            <FileSearch className="h-3.5 w-3.5" /> {frontierOpen}
          </span>
        )}
        <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">{fitScore}%</span>
        <span className="hidden text-xs text-subtle sm:block">{formatRelativeTime(lastActive)}</span>
      </div>
    </Link>
  );
}
