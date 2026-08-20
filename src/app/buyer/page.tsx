"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquareText,
  PartyPopper,
  Search,
  Sparkles,
  SlidersHorizontal,
  Store,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { LoadingState } from "@/components/shared/loading-state";
import { PipelineTracker, type PipelineStage } from "@/components/shared/pipeline-tracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EvidenceBadge } from "@/components/shared/status-badge";
import {
  getBuyerRequirements,
  getBuyerWorkflowRunHistory,
  getCapabilityFrontierItems,
  getRoiProjection,
  getSolutionModel,
  type BuyerRequirementRow,
  type BuyerWorkflowRunRow,
  type CapabilityFrontierRow,
  type RoiProjectionRow,
} from "@/lib/api/buyer-lookup";
import { useAgentStatus } from "@/lib/hooks/use-agent-status";
import { useBuyerSession } from "@/lib/hooks/use-buyer-session";
import { cn, formatCurrencyINR, formatRelativeTime } from "@/lib/utils";

export default function BuyerDashboardPage() {
  const { buyerId, companyName, vendorId, vendorName } = useBuyerSession();

  const [requirements, setRequirements] = useState<BuyerRequirementRow[]>([]);
  const [frontierItems, setFrontierItems] = useState<CapabilityFrontierRow[]>([]);
  const [roi, setRoi] = useState<RoiProjectionRow | null>(null);
  const [runs, setRuns] = useState<BuyerWorkflowRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const agentStatus = useAgentStatus(buyerId);

  useEffect(() => {
    if (!buyerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [reqs, frontier, history] = await Promise.all([
          getBuyerRequirements(buyerId!),
          getCapabilityFrontierItems(buyerId!),
          getBuyerWorkflowRunHistory(buyerId!, 6),
        ]);
        if (cancelled) return;
        setRequirements(reqs);
        setFrontierItems(frontier);
        setRuns(history);
        if (vendorId) {
          const model = await getSolutionModel(buyerId!, vendorId);
          if (model && !cancelled) setRoi(await getRoiProjection(model.id));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [buyerId, vendorId]);

  if (!buyerId) {
    return (
      <div className="hero-glow bg-noise rounded-3xl border border-border bg-surface px-6 py-16 text-center sm:px-12">
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-gradient-to-r from-brand-50 to-accent-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:border-brand-800 dark:from-brand-950/50 dark:to-accent-500/10 dark:text-brand-300">
          <Sparkles className="h-3 w-3" /> Deck-less Pitch
        </span>
        <h1 className="font-display mx-auto max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          No deck. A live model of your business, built for you.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted sm:text-base">
          Tell us what you&apos;re trying to solve — our agent builds an evidence-grounded, personalized solution you can
          explore yourself, no sales deck required.
        </p>
        <Link href="/buyer/discover" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-8")}>
          Start your discovery <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const openItems = frontierItems.filter((f) => f.status !== "resolved" && f.status !== "closed");
  const confirmedCount = requirements.filter((r) => r.status === "confirmed").length;

  const stages: PipelineStage[] = [
    { key: "discover", label: "Discover", href: "/buyer/discover", icon: Search, done: requirements.length > 0 },
    { key: "vendor", label: "Vendor", href: "/buyer/vendors", icon: Store, done: !!vendorId },
    { key: "solution", label: "Solution", href: "/buyer/solution", icon: Sparkles, done: !!roi },
    { key: "scenarios", label: "Scenarios", href: "/buyer/scenarios", icon: SlidersHorizontal, done: !!roi && openItems.length === 0 },
    { key: "handoff", label: "Handoff", href: "/buyer/handoff", icon: CalendarClock, done: agentStatus.status === "completed" },
  ];

  return (
    <div>
      <div className="hero-glow bg-noise mb-6 overflow-hidden rounded-3xl border border-border bg-surface px-6 py-8 sm:px-8 sm:py-10">
        <PageHeader
          eyebrow={companyName ?? "Your organization"}
          title="Welcome back"
          description={
            vendorName
              ? `Here's where your ${vendorName} solution stands, and what still needs an answer.`
              : "Confirm a vendor to build your personalized solution."
          }
          actions={
            <Link href="/buyer/solution" className={cn(buttonVariants({ variant: "primary" }))}>
              Open solution workspace <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
          className="mb-8"
        />
        <PipelineTracker stages={stages} />
      </div>

      {agentStatus.status === "completed" && (
        <Card className="mb-6 border-brand-300 bg-gradient-to-br from-brand-50 to-accent-50 dark:border-brand-800 dark:from-brand-950/30 dark:to-accent-950/20 animate-slide-up">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <PartyPopper className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
              <div>
                <p className="text-sm font-semibold text-foreground">Your agent has finished — your solution is ready</p>
                <p className="text-xs text-muted">Open the solution workspace to review it and download your pitch deck.</p>
              </div>
            </div>
            <Link href="/buyer/solution" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
              View solution <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <>
          <LoadingState variant="stats" count={4} />
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <LoadingState variant="lines" count={4} />
            </div>
            <LoadingState variant="lines" count={3} />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard index={0} label="Requirements captured" value={String(requirements.length)} icon={TrendingUp} tone="verified" />
            <StatCard index={1} label="Confirmed" value={String(confirmedCount)} icon={MessageSquareText} tone="brand" />
            <StatCard index={2} label="Vendor selected" value={vendorName ? "1" : "0"} icon={Store} tone="accent" />
            <StatCard index={3} label="Open questions" value={String(openItems.length)} icon={Sparkles} tone="escalated" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3 animate-slide-up">
            <Card className="lg:col-span-2 transition-shadow hover:shadow-md">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Your vendor</CardTitle>
                <Link href="/buyer/vendors" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                  {vendorName ? "Compare vendors" : "See recommendations"}
                </Link>
              </CardHeader>
              <CardContent className="pt-2">
                {vendorName ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-lg font-bold text-white">
                        {vendorName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-foreground">{vendorName}</p>
                      </div>
                    </div>

                    {roi && (
                      <div className="mt-5 rounded-xl bg-surface-2 p-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted">Projected annual savings</span>
                          <span className="font-semibold text-verified">{roi.savingsPercent ?? 0}%</span>
                        </div>
                        <Progress value={roi.savingsPercent ?? 0} className="mt-2" size="sm" />
                        {roi.currentAnnualCost != null && roi.projectedAnnualCost != null && (
                          <p className="mt-2 text-xs text-subtle">
                            From {formatCurrencyINR(roi.currentAnnualCost)} to {formatCurrencyINR(roi.projectedAnnualCost)}/year
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {requirements.slice(0, 3).map((r) => (
                        <Badge key={r.id} variant="outline" size="sm">{r.text}</Badge>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted">No vendor confirmed yet — head to vendor recommendations to choose one.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Awaiting confirmation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {openItems.length === 0 ? (
                  <p className="text-sm text-subtle">Nothing open right now.</p>
                ) : (
                  openItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-xl border border-border bg-surface-2 p-3.5">
                      <p className="text-sm font-medium text-foreground">{item.question}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <EvidenceBadge status="unverified" />
                        <Link href="/buyer/handoff" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                          Track
                        </Link>
                      </div>
                    </div>
                  ))
                )}
                <Link href="/buyer/chat" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}>
                  <MessageSquareText className="h-3.5 w-3.5" /> Ask another question
                </Link>
              </CardContent>
            </Card>
          </div>

          {runs.length > 0 && (
            <Card className="mt-6 animate-slide-up">
              <CardHeader>
                <CardTitle>Agent activity</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <ul className="space-y-1">
                  {runs.map((run) => (
                    <li key={run.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2">
                      {run.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-verified" />
                      ) : run.status === "failed" ? (
                        <XCircle className="h-4 w-4 shrink-0 text-escalated" />
                      ) : (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          {run.status === "completed"
                            ? "Agent run completed"
                            : run.status === "failed"
                              ? "Agent run failed"
                              : "Agent working…"}
                          {run.deckSyncedAt && <span className="ml-1.5 text-xs text-verified">· deck ready</span>}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-subtle">
                        <Clock className="h-3 w-3" /> {formatRelativeTime(run.completedAt ?? run.startedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
