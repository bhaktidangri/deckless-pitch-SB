"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RequirementCard } from "@/components/shared/requirement-card";
import { clientRealityProfile, requirements as initialRequirements } from "@/lib/dummy-data";
import type { Requirement } from "@/lib/types";
import { formatCurrencyINR, formatNumber } from "@/lib/utils";

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newReq, setNewReq] = useState("");

  function addRequirement() {
    if (!newReq.trim()) return;
    setRequirements((r) => [
      { id: `req-local-${Date.now()}`, text: newReq.trim(), priority: "medium", status: "captured", source: "buyer_input" },
      ...r,
    ]);
    setNewReq("");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Discovery"
        title="Requirements"
        description="Everything captured from your discovery conversation and current business context."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="flex gap-2 py-4">
              <Input placeholder="Add a requirement manually..." value={newReq} onChange={(e) => setNewReq(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRequirement()} />
              <Button onClick={addRequirement}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2.5">
            {requirements.map((r) => (
              <RequirementCard key={r.id} requirement={r} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Reality Profile</CardTitle>
              <CardDescription>Auto-built from discovery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <Row label="Current cost" value={formatCurrencyINR(clientRealityProfile.currentCostAnnual)} />
              <Row label="Users" value={formatNumber(clientRealityProfile.users)} />
              <Row label="Timeline" value={`${clientRealityProfile.timelineMonths} months`} />
              <div>
                <p className="mb-1.5 text-xs font-medium text-subtle">Current technology</p>
                <div className="flex flex-wrap gap-1.5">
                  {clientRealityProfile.currentTechnology.map((t) => (
                    <span key={t} className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
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
