"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, RotateCcw, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScenarioSlider } from "@/components/shared/scenario-slider";
import { RoiWidget } from "@/components/shared/roi-widget";
import { clientRealityProfile } from "@/lib/dummy-data";
import { formatCurrencyINR, formatNumber } from "@/lib/utils";

const BASE_USERS = clientRealityProfile.users;
const BASE_CURRENT = 4200000;
const BASE_PROJECTED = 2730000;
const BASE_TIMELINE = clientRealityProfile.timelineMonths;

export default function ScenariosPage() {
  const [users, setUsers] = useState(BASE_USERS);
  const [timeline, setTimeline] = useState(BASE_TIMELINE);

  const result = useMemo(() => {
    const userRatio = users / BASE_USERS;
    const currentAtScale = Math.round(BASE_CURRENT * userRatio);
    const projectedAtScale = Math.round(BASE_PROJECTED * Math.pow(userRatio, 0.78));
    const savingsPercent = Math.round((1 - projectedAtScale / currentAtScale) * 100);
    const timelineFactor = BASE_TIMELINE / timeline;
    const paybackMonths = Math.max(3, Math.round(8 * timelineFactor));
    const threeYearSavings = (currentAtScale - projectedAtScale) * 3;
    const isRisky = timeline < 4;

    return {
      currentAnnualCost: currentAtScale,
      projectedAnnualCost: projectedAtScale,
      savingsPercent,
      paybackMonths,
      threeYearSavings,
      isRisky,
      chart: [
        { year: "Current", current: currentAtScale, projected: currentAtScale },
        { year: "Year 1", current: currentAtScale, projected: Math.round(projectedAtScale * 1.08) },
        { year: "Year 2", current: currentAtScale, projected: projectedAtScale },
        { year: "Year 3", current: currentAtScale, projected: Math.round(projectedAtScale * 0.96) },
      ],
    };
  }, [users, timeline]);

  function reset() {
    setUsers(BASE_USERS);
    setTimeline(BASE_TIMELINE);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Scenario Engine"
        title="What if...?"
        description="Adjust your assumptions and watch the solution model recalculate in real time — no new meeting required."
        actions={
          <Button variant="secondary" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset to current
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Adjust assumptions
            </CardTitle>
            <CardDescription>Changes recalculate ROI, feasibility, and risk instantly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            <ScenarioSlider
              label="Number of users"
              value={users}
              min={200}
              max={2000}
              step={50}
              onChange={setUsers}
              formatValue={(v) => formatNumber(v)}
            />
            <ScenarioSlider
              label="Implementation timeline"
              value={timeline}
              min={2}
              max={12}
              step={1}
              suffix=" months"
              onChange={setTimeline}
            />

            {result.isRisky && (
              <div className="flex items-start gap-2.5 rounded-xl border border-escalated-border bg-escalated-bg p-3.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-escalated" />
                <div>
                  <p className="text-xs font-medium text-escalated">Feasibility risk</p>
                  <p className="mt-0.5 text-xs text-foreground/80">
                    A timeline under 4 months compresses CloudNova&apos;s phased migration methodology and
                    increases cutover risk. This has not been validated against vendor capacity.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-surface-2 p-3.5">
              <p className="text-xs font-medium text-subtle">Baseline (unchanged)</p>
              <p className="mt-1 text-sm text-foreground">
                {formatNumber(BASE_USERS)} users &middot; {BASE_TIMELINE}-month timeline &middot; {formatCurrencyINR(BASE_CURRENT)}/year
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="modelled">
              <Sparkles className="h-3 w-3" /> Modelled projection — assumptions applied
            </Badge>
            {users !== BASE_USERS && <Badge variant="outline">Users changed: {formatNumber(BASE_USERS)} → {formatNumber(users)}</Badge>}
            {timeline !== BASE_TIMELINE && <Badge variant="outline">Timeline changed: {BASE_TIMELINE}mo → {timeline}mo</Badge>}
          </div>
          <RoiWidget roi={result} />
          <p className="text-xs text-subtle">
            Estimate based on your current usage profile and CloudNova&apos;s published 25-40% optimization range.
            Scaling assumes sub-linear infrastructure growth typical of Kubernetes elasticity.
          </p>
        </div>
      </div>
    </div>
  );
}
