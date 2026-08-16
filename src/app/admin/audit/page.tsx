"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AuditTimeline } from "@/components/shared/audit-timeline";
import { auditEvents } from "@/lib/dummy-data";

const agents = ["all", "Vendor Intelligence Agent", "Buyer Discovery Agent", "Solution Matching Agent", "Solution Model Agent", "Grounding & Escalation Agent"];

export default function AdminAuditPage() {
  const [tab, setTab] = useState("all");
  const filtered = tab === "all" ? auditEvents : auditEvents.filter((e) => e.agentName === tab);

  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Audit & Evidence"
        description="Every AI-generated claim retains its source, agent, confidence, and human verification status."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 flex-wrap">
          {agents.map((a) => (
            <TabsTrigger key={a} value={a}>
              {a === "all" ? "All agents" : a.replace(" Agent", "")}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab}>
          <Card>
            <CardContent className="pt-6">
              {filtered.length > 0 ? (
                <AuditTimeline events={filtered} />
              ) : (
                <p className="py-10 text-center text-sm text-muted">No events for this agent yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
