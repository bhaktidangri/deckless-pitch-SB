"use client";

import { useState } from "react";
import { Database, KeyRound, Radar, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialToggles = {
  autoEscalate: true,
  requireHumanForPricing: true,
  realtimeNotifications: true,
  conflictAutoResolve: false,
  strictEvidenceMode: true,
};

export default function PlatformSettingsPage() {
  const [toggles, setToggles] = useState(initialToggles);
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);

  function toggle(key: keyof typeof initialToggles) {
    setToggles((t) => ({ ...t, [key]: !t[key] }));
  }

  return (
    <div>
      <PageHeader eyebrow="Governance" title="Platform settings" description="Global controls for grounding behavior, escalation, and integrations." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Grounding &amp; escalation
            </CardTitle>
            <CardDescription>Controls how confidently the AI answers before escalating to a human.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            <SettingRow
              label="Auto-escalate unverified answers"
              desc="Create a Capability Frontier item whenever evidence is insufficient."
              checked={toggles.autoEscalate}
              onChange={() => toggle("autoEscalate")}
            />
            <SettingRow
              label="Always require human for pricing"
              desc="Final pricing and discounts are never quoted by the AI."
              checked={toggles.requireHumanForPricing}
              onChange={() => toggle("requireHumanForPricing")}
            />
            <SettingRow
              label="Strict evidence mode"
              desc="Reject modelled answers when fewer than 2 sources agree."
              checked={toggles.strictEvidenceMode}
              onChange={() => toggle("strictEvidenceMode")}
            />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="mb-0">Minimum confidence to auto-answer</Label>
                <span className="font-mono text-sm font-semibold text-brand-600 dark:text-brand-400">{confidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={95}
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="scenario-range h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-2"
                style={{ background: `linear-gradient(to right, var(--brand-500) ${((confidenceThreshold - 40) / 55) * 100}%, var(--surface-2) ${((confidenceThreshold - 40) / 55) * 100}%)` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Notifications &amp; sync
            </CardTitle>
            <CardDescription>Realtime delivery of Capability Frontier and solution updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            <SettingRow
              label="Realtime notifications"
              desc="Push new frontier items and vendor responses instantly to dashboards."
              checked={toggles.realtimeNotifications}
              onChange={() => toggle("realtimeNotifications")}
            />
            <SettingRow
              label="Auto-resolve source conflicts"
              desc="Let the AI pick the most recent source instead of flagging for review."
              checked={toggles.conflictAutoResolve}
              onChange={() => toggle("conflictAutoResolve")}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Integrations
            </CardTitle>
            <CardDescription>Connection status for backend and intelligence services (configured later).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-2 sm:grid-cols-2">
            <div className="rounded-xl border border-dashed border-border p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground"><Database className="h-4 w-4" /> Supabase</p>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-subtle">Not connected</span>
              </div>
              <p className="mt-2 text-xs text-muted">Application database, auth, storage, and realtime — connect when ready.</p>
              <Input placeholder="Project URL" className="mt-3" disabled />
            </div>
            <div className="rounded-xl border border-dashed border-border p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground"><Radar className="h-4 w-4" /> YOKA.ai</p>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-subtle">Not connected</span>
              </div>
              <p className="mt-2 text-xs text-muted">Agentic reasoning layer for discovery, matching, and grounded chat.</p>
              <Input placeholder="API key" className="mt-3" disabled />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button>Save settings</Button>
      </div>
    </div>
  );
}

function SettingRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
