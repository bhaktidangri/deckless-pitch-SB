import Link from "next/link";
import { ArrowUpRight, MessageSquareText, Sparkles, Store, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EvidenceBadge } from "@/components/shared/status-badge";
import {
  capabilityFrontierItems,
  dashboardStats,
  primaryVendor,
  requirements,
  roiProjection,
} from "@/lib/dummy-data";
import { cn, formatCurrencyINR } from "@/lib/utils";

export default function BuyerDashboardPage() {
  const stats = dashboardStats.buyer;
  const openItems = capabilityFrontierItems.filter((f) => f.status !== "resolved" && f.status !== "closed");

  return (
    <div>
      <PageHeader
        eyebrow="Meridian Retail Group"
        title="Welcome back, Priya"
        description="Here's where your CloudNova solution stands, and what still needs an answer."
        actions={
          <Link href="/buyer/solution" className={cn(buttonVariants({ variant: "primary" }))}>
            Open solution workspace <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Solution readiness" value={`${stats.solutionReadiness}%`} icon={TrendingUp} tone="verified" />
        <StatCard label="Questions resolved" value={String(stats.questionsResolved)} icon={MessageSquareText} tone="brand" />
        <StatCard label="Vendors explored" value={String(stats.vendorsExplored)} icon={Store} tone="accent" />
        <StatCard label="Open questions" value={String(stats.openQuestions)} icon={Sparkles} tone="escalated" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Your recommended vendor</CardTitle>
            <Link href="/buyer/vendors" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              Compare vendors
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-lg font-bold text-white">
                {primaryVendor.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-foreground">{primaryVendor.name}</p>
                <p className="text-sm text-muted">{primaryVendor.tagline}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{primaryVendor.fitScore}%</p>
                <p className="text-[11px] uppercase tracking-wide text-subtle">fit score</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-surface-2 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Projected annual savings</span>
                <span className="font-semibold text-verified">{roiProjection.savingsPercent}%</span>
              </div>
              <Progress value={roiProjection.savingsPercent} className="mt-2" size="sm" />
              <p className="mt-2 text-xs text-subtle">
                From {formatCurrencyINR(roiProjection.currentAnnualCost)} to {formatCurrencyINR(roiProjection.projectedAnnualCost)}/year
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {requirements.slice(0, 3).map((r) => (
                <Badge key={r.id} variant="outline" size="sm">{r.text}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Awaiting confirmation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {openItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-surface-2 p-3.5">
                <p className="text-sm font-medium text-foreground">{item.question}</p>
                <div className="mt-2 flex items-center justify-between">
                  <EvidenceBadge status="unverified" />
                  <Link href="/buyer/handoff" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                    Track
                  </Link>
                </div>
              </div>
            ))}
            <Link href="/buyer/chat" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}>
              <MessageSquareText className="h-3.5 w-3.5" /> Ask another question
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
