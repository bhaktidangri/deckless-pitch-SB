"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, MessageSquareText, RefreshCcw, SlidersHorizontal, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GapCard } from "@/components/shared/gap-card";
import { MatchRow } from "@/components/shared/match-row";
import { RoiWidget } from "@/components/shared/roi-widget";
import { PresentationDeck, type Slide } from "@/components/shared/presentation-deck";
import { FrontierCard } from "@/components/shared/frontier-card";
import {
  capabilities,
  capabilityFrontierItems,
  clientRealityProfile,
  gapItems,
  primaryVendor,
  solutionMatches,
  solutionModel,
  requirements,
} from "@/lib/dummy-data";
import { cn, formatCurrencyINR, formatNumber, formatRelativeTime } from "@/lib/utils";

export default function SolutionWorkspacePage() {
  const [stale, setStale] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(solutionModel.updatedAt);

  function recalculate() {
    setRecalculating(true);
    setTimeout(() => {
      setRecalculating(false);
      setStale(false);
      setUpdatedAt(new Date().toISOString());
    }, 1400);
  }

  return (
    <div>
      <PageHeader
        eyebrow={`Personalized for ${primaryVendor.name}`}
        title="Your Cloud Transformation"
        description="Not a generic deck — this is how CloudNova's verified solution applies specifically to Meridian Retail Group."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/buyer/scenarios" className={cn(buttonVariants({ variant: "secondary" }))}>
              <SlidersHorizontal className="h-4 w-4" /> Run what-if
            </Link>
            <Link href="/buyer/chat" className={cn(buttonVariants({ variant: "primary" }))}>
              <MessageSquareText className="h-4 w-4" /> Ask AI
            </Link>
          </div>
        }
      />

      {stale ? (
        <Card className="mb-6 border-modelled-border bg-modelled-bg">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-modelled" />
              <p className="text-sm text-foreground">
                CloudNova updated their Solution DNA. This model may be stale — recalculate to reflect the latest capabilities.
              </p>
            </div>
            <Button size="sm" onClick={recalculate} loading={recalculating}>
              <RefreshCcw className="h-3.5 w-3.5" /> Recalculate
            </Button>
          </CardContent>
        </Card>
      ) : (
        <button onClick={() => setStale(true)} className="mb-6 text-xs text-subtle underline decoration-dotted underline-offset-4 hover:text-muted">
          Simulate: CloudNova updates their Solution DNA
        </button>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge variant="brand">Version {solutionModel.version}</Badge>
        <Badge variant="verified">Active</Badge>
        <span className="text-xs text-subtle">Last updated {formatRelativeTime(updatedAt)}</span>
      </div>

      <Tabs defaultValue="workspace">
        <TabsList className="mb-6">
          <TabsTrigger value="workspace">Interactive Workspace</TabsTrigger>
          <TabsTrigger value="presentation">Presentation Mode</TabsTrigger>
        </TabsList>

        <TabsContent value="workspace">
          <WorkspaceView />
        </TabsContent>
        <TabsContent value="presentation">
          <PresentationDeck slides={buildSlides()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkspaceView() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Executive summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-sm leading-relaxed text-muted">{solutionModel.executiveSummary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryStat label="Current annual cost" value={formatCurrencyINR(clientRealityProfile.currentCostAnnual)} />
        <SummaryStat label="Users today" value={formatNumber(clientRealityProfile.users)} />
        <SummaryStat label="Target timeline" value={`${clientRealityProfile.timelineMonths} months`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business gaps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {gapItems.map((g) => (
            <GapCard key={g.id} gap={g} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How CloudNova addresses each requirement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {solutionMatches.map((m) => (
            <MatchRow key={m.id} match={m} />
          ))}
        </CardContent>
      </Card>

      <RoiWidget roi={solutionModel.roi} />

      <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-accent-50 dark:border-brand-900 dark:from-brand-950/30 dark:to-accent-950/20">
        <CardContent className="flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-foreground">Ready to explore further?</p>
            <p className="mt-1 text-sm text-muted">Adjust assumptions in Scenarios, or ask CloudNova&apos;s AI directly.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/buyer/handoff" className={cn(buttonVariants({ variant: "secondary" }))}>
              <CalendarClock className="h-4 w-4" /> Request expert
            </Link>
            <Link href="/buyer/chat" className={cn(buttonVariants({ variant: "primary" }))}>
              Ask AI
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-subtle">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function buildSlides(): Slide[] {
  const matchedCapabilities = capabilities.filter((c) => solutionMatches.some((m) => m.capabilityId === c.id));
  const openFrontier = capabilityFrontierItems.filter((f) => f.status !== "resolved" && f.status !== "closed");

  return [
    {
      label: "Executive Summary",
      title: "Executive Summary",
      content: <p className="text-base leading-relaxed text-muted">{solutionModel.executiveSummary}</p>,
    },
    {
      label: "Current Situation",
      title: "Your Current Situation",
      content: (
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryStat label="Annual infrastructure cost" value={formatCurrencyINR(clientRealityProfile.currentCostAnnual)} />
          <SummaryStat label="Users" value={formatNumber(clientRealityProfile.users)} />
          <SummaryStat label="Avg. utilization" value="28%" />
        </div>
      ),
    },
    {
      label: "Problems Identified",
      title: "Problems Identified",
      content: (
        <ul className="space-y-2.5">
          {clientRealityProfile.painPoints.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-escalated" /> {p}
            </li>
          ))}
        </ul>
      ),
    },
    {
      label: "Business Gaps",
      title: "Business Gaps",
      content: (
        <div className="space-y-3">
          {gapItems.slice(0, 3).map((g) => (
            <GapCard key={g.id} gap={g} />
          ))}
        </div>
      ),
    },
    {
      label: "Recommended Solution",
      title: "Recommended Solution",
      content: (
        <div className="grid gap-2 sm:grid-cols-2">
          {matchedCapabilities.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-surface-2 p-3.5">
              <p className="text-sm font-semibold text-foreground">{c.name}</p>
              <p className="mt-1 text-xs text-muted line-clamp-2">{c.description}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: "Addressing Gaps",
      title: "How CloudNova Addresses Each Gap",
      content: (
        <div className="space-y-3">
          {solutionMatches.slice(0, 4).map((m) => (
            <MatchRow key={m.id} match={m} />
          ))}
        </div>
      ),
    },
    {
      label: "ROI & Impact",
      title: "Personalized ROI & Impact",
      content: <RoiWidget roi={solutionModel.roi} />,
    },
    {
      label: "Implementation",
      title: "Implementation Considerations",
      content: (
        <ul className="space-y-2.5">
          <li className="text-sm text-foreground">Timeline: {clientRealityProfile.timelineMonths}-month phased migration</li>
          {clientRealityProfile.constraints.map((c) => (
            <li key={c} className="flex items-start gap-2.5 text-sm text-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-modelled" /> {c}
            </li>
          ))}
        </ul>
      ),
    },
    {
      label: "Open Questions",
      title: "Open Questions",
      content: (
        <div className="space-y-3">
          {openFrontier.length > 0 ? (
            openFrontier.map((f) => <FrontierCard key={f.id} item={f} />)
          ) : (
            <p className="text-sm text-muted">All questions have been resolved.</p>
          )}
        </div>
      ),
    },
    {
      label: "Next Steps",
      title: "Next Steps",
      content: (
        <div>
          <p className="text-sm text-muted">
            {openFrontier.length} question{openFrontier.length === 1 ? "" : "s"} require vendor confirmation before closure.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/buyer/handoff" className={cn(buttonVariants({ variant: "primary" }))}>
              <CalendarClock className="h-4 w-4" /> Schedule with CloudNova Solutions Team
            </Link>
            <Link href="/buyer/chat" className={cn(buttonVariants({ variant: "secondary" }))}>
              Ask a follow-up question
            </Link>
          </div>
          <p className="mt-4 text-xs text-subtle">
            Requirements: {requirements.length} captured &middot; {requirements.filter((r) => r.status === "confirmed").length} confirmed
          </p>
        </div>
      ),
    },
  ];
}
