"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AuditTimeline } from "@/components/shared/audit-timeline";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { getAuditEvents } from "@/lib/api/admin-lookup";
import type { AuditEvent } from "@/lib/types";

// These are the real agent names the Yoxa workflow writes into audit_events
// (see supabase-buyer/README.md's workflow-agent roster) — kept as tab
// labels even while the table is still empty, since they're the actual
// system's categories, not fabricated data.
const agents = ["all", "Vendor Intelligence Agent", "Buyer Discovery Agent", "Solution Matching Agent", "Solution Model Agent", "Grounding & Escalation Agent"];

export default function AdminAuditPage() {
  const [tab, setTab] = useState("all");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAuditEvents(200)
      .then((e) => !cancelled && setEvents(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = tab === "all" ? events : events.filter((e) => e.agentName === tab);

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
              {loading ? (
                <AgentWaitingState variant="card" title="Loading audit trail" />
              ) : filtered.length > 0 ? (
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
