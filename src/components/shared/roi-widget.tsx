"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyINR } from "@/lib/utils";
import type { RoiProjection } from "@/lib/types";

export function RoiWidget({ roi }: { roi: RoiProjection }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Projected ROI &amp; Impact</CardTitle>
        <span className="flex items-center gap-1 rounded-full bg-verified-bg px-2.5 py-1 text-xs font-semibold text-verified">
          <TrendingDown className="h-3.5 w-3.5" />
          {roi.savingsPercent}% projected savings
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Current annual cost" value={formatCurrencyINR(roi.currentAnnualCost)} />
          <Stat label="Projected annual cost" value={formatCurrencyINR(roi.projectedAnnualCost)} highlight />
          <Stat label="Payback period" value={`${roi.paybackMonths} months`} />
          <Stat label="3-year savings" value={formatCurrencyINR(roi.threeYearSavings)} highlight />
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

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">{label}</p>
      <p className={`mt-1 text-lg font-bold ${highlight ? "text-brand-600 dark:text-brand-400" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
