"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import {
  getAllBuyers,
  getAllVendorRecommendations,
  getAllBuyerVendorSelections,
  type LeadBuyerRow,
} from "@/lib/api/admin-lookup";
import { formatRelativeTime } from "@/lib/utils";

interface BuyerRow {
  buyer: LeadBuyerRow;
  stage: "Discovery" | "Vendor Selection" | "Solution Workspace";
  fitScore: number | null;
}

const stageTone: Record<string, "verified" | "modelled" | "brand" | "default"> = {
  Discovery: "default",
  "Vendor Selection": "brand",
  "Solution Workspace": "modelled",
};

export default function AdminBuyersPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<BuyerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [buyers, recs, selections] = await Promise.all([getAllBuyers(), getAllVendorRecommendations(), getAllBuyerVendorSelections()]);
        if (cancelled) return;
        setRows(
          buyers.map((buyer) => {
            const bestFit = recs.filter((r) => r.buyerId === buyer.id).sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0))[0];
            const buyerSelections = selections.filter((s) => s.buyerId === buyer.id);
            const stage: BuyerRow["stage"] = buyerSelections.some((s) => s.isActive)
              ? "Solution Workspace"
              : buyerSelections.length > 0
                ? "Vendor Selection"
                : "Discovery";
            return { buyer, stage, fitScore: bestFit?.fitScore ?? null };
          })
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = rows.filter((r) => r.buyer.companyName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <PageHeader eyebrow="Management" title="Buyers" description="All buyer organizations exploring vendor solutions." />

      <div className="mb-5 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input placeholder="Search buyers..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {loading ? (
        <AgentWaitingState variant="card" title="Loading buyers" />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">{rows.length === 0 ? "No buyers registered yet." : `No buyer matches "${query}".`}</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs font-medium uppercase tracking-wide text-subtle">
                  <th className="px-5 py-3">Buyer</th>
                  <th className="px-5 py-3">Industry</th>
                  <th className="px-5 py-3">Stage</th>
                  <th className="px-5 py-3">Best fit</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.buyer.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.buyer.companyName} size="sm" color="accent" />
                        <p className="font-medium text-foreground">{r.buyer.companyName}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{r.buyer.industry ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={stageTone[r.stage]} size="sm">{r.stage}</Badge>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-brand-600 dark:text-brand-400">{r.fitScore != null ? `${r.fitScore}%` : "—"}</td>
                    <td className="px-5 py-3.5 text-muted">{formatRelativeTime(r.buyer.createdAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="rounded-md p-1.5 text-subtle hover:bg-surface-hover hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
