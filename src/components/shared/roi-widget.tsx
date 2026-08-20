"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrencyINR } from "@/lib/utils";
import type { RoiProjection } from "@/lib/types";

export function RoiWidget({ roi }: { roi: RoiProjection }) {
  // The agent's own modelled numbers can genuinely go either way (e.g. a
  // rushed short timeline can cost more than the status quo) — this used to
  // always render as a green "savings" badge with a downward-trend icon even
  // when the projection showed a net cost increase, which read as the tool
  // lying about its own numbers. Sign-aware now: negative savings show as an
  // increase, in escalated styling, not a misleadingly "positive" badge.
  const isIncrease = roi.savingsPercent < 0;
  const hasRealPayback = roi.paybackMonths > 0 && !isIncrease;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Projected ROI &amp; Impact</CardTitle>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
            isIncrease ? "bg-escalated-bg text-escalated" : "bg-verified-bg text-verified"
          )}
        >
          {isIncrease ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {isIncrease ? `${Math.abs(roi.savingsPercent)}% projected cost increase` : `${roi.savingsPercent}% projected savings`}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Current annual cost" value={formatCurrencyINR(roi.currentAnnualCost)} />
          <Stat label="Projected annual cost" value={formatCurrencyINR(roi.projectedAnnualCost)} highlight={!isIncrease} tone={isIncrease ? "escalated" : undefined} />
          <Stat label="Payback period" value={hasRealPayback ? `${roi.paybackMonths} months` : "N/A"} />
          <Stat
            label={isIncrease ? "3-year cost increase" : "3-year savings"}
            value={formatCurrencyINR(Math.abs(roi.threeYearSavings))}
            highlight={!isIncrease}
            tone={isIncrease ? "escalated" : undefined}
          />
        </div>

        <div className="mt-6 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={roi.chart} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--subtle)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--subtle)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-500)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--brand-500)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
              <YAxis
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrencyINR(v)}
                width={64}
              />
              <Tooltip
                formatter={(value) => formatCurrencyINR(Number(value))}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
              />
              <Area type="monotone" dataKey="current" stroke="var(--subtle)" strokeWidth={2} fill="url(#currentGrad)" name="Current trajectory" />
              <Area type="monotone" dataKey="projected" stroke="var(--brand-500)" strokeWidth={2.5} fill="url(#projectedGrad)" name="With CloudNova" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center justify-center gap-5 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-subtle" /> Current trajectory
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-500" /> Projected with vendor
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, highlight, tone }: { label: string; value: string; highlight?: boolean; tone?: "escalated" }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">{label}</p>
      <p className={cn("mt-1 text-lg font-bold", tone === "escalated" ? "text-escalated" : highlight ? "text-brand-600 dark:text-brand-400" : "text-foreground")}>
        {value}
      </p>
    </div>
  );
}
