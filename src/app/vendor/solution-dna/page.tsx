"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Dna, FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CapabilityCard } from "@/components/shared/capability-card";
import { capabilities, primaryVendor, vendorSources } from "@/lib/dummy-data";
import type { CapabilityCategory } from "@/lib/types";

const categories: { key: CapabilityCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "product", label: "Products" },
  { key: "service", label: "Services" },
  { key: "industry", label: "Industries" },
  { key: "integration", label: "Integrations" },
  { key: "constraint", label: "Constraints" },
];

export default function SolutionDnaPage() {
  const [tab, setTab] = useState<string>("all");
  const verifiedCount = capabilities.filter((c) => c.verificationStatus === "verified").length;
  const unverifiedCount = capabilities.filter((c) => c.verificationStatus === "unverified").length;
  const completedSources = vendorSources.filter((s) => s.processingStatus === "completed").length;

  const filtered = tab === "all" ? capabilities : capabilities.filter((c) => c.category === tab);

  return (
    <div>
      <PageHeader
        eyebrow={`${primaryVendor.name} Solution DNA`}
        title="Structured capability knowledge base"
        description="The AI-extracted, source-linked representation of everything CloudNova can verifiably provide."
        actions={
          <Button variant="secondary">
            <Plus className="h-4 w-4" /> Add manual entry
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <MiniStat icon={Dna} label="Total capabilities" value={capabilities.length} />
        <MiniStat icon={CheckCircle2} label="Verified" value={verifiedCount} tone="verified" />
        <MiniStat icon={AlertTriangle} label="Needs verification" value={unverifiedCount} tone="escalated" />
        <MiniStat icon={FileText} label="Sources processed" value={completedSources} tone="brand" />
      </div>

      <Card className="mb-6 border-modelled-border bg-modelled-bg">
        <CardContent className="flex items-start gap-3 py-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-modelled" />
          <div>
            <p className="text-sm font-medium text-foreground">Conflict detected between sources</p>
            <p className="mt-1 text-xs text-foreground/80">
              &ldquo;CloudNova_Pricing_Sheet_Q3.pdf&rdquo; states a 15-minute incident response SLA, while an
              internal sales note references a 5-minute SLA for Enterprise accounts. This has not been
              auto-resolved — please confirm which is authoritative.
            </p>
            <Button size="sm" variant="secondary" className="mt-3">
              Resolve conflict
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5 flex-wrap">
          {categories.map((c) => (
            <TabsTrigger key={c.key} value={c.key}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab}>
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((cap) => (
              <CapabilityCard key={cap.id} capability={cap} />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">No capabilities in this category yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tone = "default" }: { icon: React.ElementType; label: string; value: number; tone?: "verified" | "escalated" | "brand" | "default" }) {
  const toneClass: Record<string, string> = {
    verified: "text-verified bg-verified-bg",
    escalated: "text-escalated bg-escalated-bg",
    brand: "text-brand-600 bg-brand-50 dark:text-brand-300 dark:bg-brand-950/40",
    default: "text-muted bg-surface-2",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted">{label}</p>
        </div>
      </div>
    </Card>
  );
}
