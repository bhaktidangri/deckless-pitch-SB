"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { RequirementCard } from "@/components/shared/requirement-card";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { getBuyerRequirements, getClientRealityProfile, type BuyerRequirementRow, type ClientRealityProfileRow } from "@/lib/api/buyer-lookup";
import { useBuyerSession } from "@/lib/hooks/use-buyer-session";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { cn, formatCurrencyINR, formatNumber } from "@/lib/utils";
import type { Requirement } from "@/lib/types";

// Read-only, matching the workflow exactly — Capture Initial Requirement
// Summary runs once on submission with no later "append a requirement"
// tool, so there's nothing for a manual-add box here to actually persist.
export default function RequirementsPage() {
  const { buyerId } = useBuyerSession();
  const [requirements, setRequirements] = useState<BuyerRequirementRow[]>([]);
  const [profile, setProfile] = useState<ClientRealityProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeBump, setRealtimeBump] = useState(0);

  useRealtimeRefresh(
    buyerId
      ? [
          { table: "buyer_requirements", filter: `buyer_id=eq.${buyerId}` },
          { table: "client_reality_profiles", filter: `buyer_id=eq.${buyerId}` },
        ]
      : [],
    () => setRealtimeBump((n) => n + 1),
    [buyerId]
  );

  useEffect(() => {
    if (!buyerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [reqs, p] = await Promise.all([getBuyerRequirements(buyerId!), getClientRealityProfile(buyerId!)]);
        if (!cancelled) {
          setRequirements(reqs);
          setProfile(p);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [buyerId, realtimeBump]);

  if (!buyerId) {
    return (
      <div>
        <PageHeader eyebrow="Discovery" title="Requirements" description="Start a discovery submission first." />
        <Card className="max-w-md p-6 text-center">
          <p className="text-sm text-muted">No buyer session found in this browser yet.</p>
          <Link href="/buyer/discover" className={cn(buttonVariants({ variant: "primary" }), "mt-4")}>
            Go to Discover
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Discovery"
        title="Requirements"
        description="Everything captured from your submission, atomic so each one matches independently against vendor capabilities."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2.5 lg:col-span-2">
          {loading && requirements.length === 0 ? (
            <AgentWaitingState variant="card" title="Loading your requirements" description="Fetching what the agent has captured so far." />
          ) : requirements.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted">No requirements captured yet.</Card>
          ) : (
            requirements.map((r) => (
              <RequirementCard
                key={r.id}
                requirement={{ id: r.id, text: r.text, priority: r.priority, status: r.status, source: r.source } satisfies Requirement}
              />
            ))
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <p className="text-sm font-semibold text-foreground">Client Reality Profile</p>
              {!profile ? (
                <p className="text-sm text-subtle">Not built yet — this fills in once you&apos;ve selected a vendor.</p>
              ) : (
                <>
                  {profile.currentCostAnnual !== null && <Row label="Current cost" value={formatCurrencyINR(profile.currentCostAnnual)} />}
                  {profile.users !== null && <Row label="Users" value={formatNumber(profile.users)} />}
                  {profile.timelineMonths !== null && <Row label="Timeline" value={`${profile.timelineMonths} months`} />}
                  {profile.currentTechnology.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-subtle">Current technology</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.currentTechnology.map((t) => (
                          <span key={t} className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
