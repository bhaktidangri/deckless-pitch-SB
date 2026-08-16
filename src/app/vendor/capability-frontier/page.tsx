"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FrontierCard } from "@/components/shared/frontier-card";
import { capabilityFrontierItems } from "@/lib/dummy-data";
import type { FrontierStatus } from "@/lib/types";

const tabs: { key: FrontierStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "vendor_review", label: "In review" },
  { key: "resolved", label: "Resolved" },
];

export default function CapabilityFrontierPage() {
  const [tab, setTab] = useState<string>("all");
  const filtered = tab === "all" ? capabilityFrontierItems : capabilityFrontierItems.filter((f) => f.status === tab);

  return (
    <div>
      <PageHeader
        eyebrow="Grounding & Escalation"
        title="Capability Frontier"
        description="Buyer questions the AI could not verify against your Solution DNA — routed here instead of being guessed."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5">
          {tabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab}>
          <div className="space-y-4">
            {filtered.map((item) => (
              <FrontierCard key={item.id} item={item} />
            ))}
            {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted">Nothing here yet.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
