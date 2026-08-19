"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, FileSearch, Loader2, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { getBuyer } from "@/lib/api/buyer-lookup";
import { getFrontierItemsForVendor, resolveCapabilityFrontierItem, type VendorFrontierItemRow } from "@/lib/api/vendor-frontier";
import { getStoredVendorId } from "@/lib/vendor-session";
import type { FrontierStatus } from "@/lib/types";

const tabs: { key: FrontierStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "vendor_review", label: "In review" },
  { key: "resolved", label: "Resolved" },
];

const statusConfig: Record<FrontierStatus, { label: string; variant: "escalated" | "modelled" | "verified" | "default" }> = {
  open: { label: "Open", variant: "escalated" },
  vendor_review: { label: "Vendor reviewing", variant: "modelled" },
  vendor_answered: { label: "Vendor answered", variant: "verified" },
  resolved: { label: "Resolved", variant: "verified" },
  closed: { label: "Closed", variant: "default" },
};

// PRD §7.7: "the vendor pages currently have no working answer/confirm
// controls wired up in the frontend" — this is that control, calling the
// new resolve-capability-frontier-item function (staged in supabase-buyer/,
// not yet deployed).
export default function CapabilityFrontierPage() {
  const vendorId = getStoredVendorId();
  const [tab, setTab] = useState<string>("all");
  const [items, setItems] = useState<VendorFrontierItemRow[]>([]);
  const [buyerNames, setBuyerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function refresh() {
    if (!vendorId) {
      setLoading(false);
      return;
    }
    try {
      const rows = await getFrontierItemsForVendor(vendorId);
      setItems(rows);
      const unknownBuyerIds = [...new Set(rows.map((r) => r.buyerId))].filter((id) => !buyerNames[id]);
      if (unknownBuyerIds.length > 0) {
        const buyers = await Promise.all(unknownBuyerIds.map((id) => getBuyer(id).catch(() => null)));
        setBuyerNames((prev) => {
          const next = { ...prev };
          buyers.forEach((b) => {
            if (b) next[b.id] = b.companyName;
          });
          return next;
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  async function answer(itemId: string) {
    const text = (drafts[itemId] ?? "").trim();
    if (!text) return;
    setSubmitting(itemId);
    try {
      await resolveCapabilityFrontierItem(itemId, text);
      setDrafts((d) => ({ ...d, [itemId]: "" }));
      await refresh();
    } finally {
      setSubmitting(null);
    }
  }

  if (!vendorId) {
    return (
      <div>
        <PageHeader eyebrow="Grounding & Escalation" title="Capability Frontier" description="No vendor session found in this browser." />
      </div>
    );
  }

  const filtered = tab === "all" ? items : items.filter((f) => f.status === tab);

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
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</p>
          ) : (
            <div className="space-y-4">
              {filtered.map((item) => {
                const cfg = statusConfig[item.status];
                const canAnswer = item.status !== "resolved" && item.status !== "closed";
                return (
                  <Card key={item.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-subtle">{buyerNames[item.buyerId] ?? "Buyer"}</p>
                        <h4 className="mt-1 text-sm font-semibold text-foreground">&ldquo;{item.question}&rdquo;</h4>
                      </div>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </div>

                    {(item.requirement || item.context) && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {item.requirement && (
                          <div className="rounded-lg bg-surface-2 p-3">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">Requirement</p>
                            <p className="mt-1 text-sm text-foreground">{item.requirement}</p>
                          </div>
                        )}
                        {item.context && (
                          <div className="rounded-lg bg-surface-2 p-3">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">Buyer context</p>
                            <p className="mt-1 text-sm text-foreground">{item.context}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {item.reasonUnresolved && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-escalated-border bg-escalated-bg p-3">
                        <FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-escalated" />
                        <div>
                          <p className="text-xs font-medium text-escalated">Why unresolved</p>
                          <p className="mt-0.5 text-xs text-foreground/80">{item.reasonUnresolved}</p>
                        </div>
                      </div>
                    )}

                    {item.vendorResponse ? (
                      <div className="mt-3 rounded-lg border border-verified-border bg-verified-bg p-3">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-verified"><CheckCircle2 className="h-3.5 w-3.5" /> Your response</p>
                        <p className="mt-0.5 text-xs text-foreground/80">{item.vendorResponse}</p>
                      </div>
                    ) : canAnswer ? (
                      <div className="mt-4 space-y-2 border-t border-border pt-4">
                        <Textarea
                          rows={3}
                          placeholder="Answer this question for the buyer…"
                          value={drafts[item.id] ?? ""}
                          onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                        />
                        <Button size="sm" loading={submitting === item.id} disabled={!drafts[item.id]?.trim()} onClick={() => answer(item.id)}>
                          Send answer
                        </Button>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-subtle">
                      {item.recommendedExpert && (
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5" /> Recommended expert: <span className="font-medium text-foreground">{item.recommendedExpert}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </Card>
                );
              })}
              {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted">Nothing here yet.</p>}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
