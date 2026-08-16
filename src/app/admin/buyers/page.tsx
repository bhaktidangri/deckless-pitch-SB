"use client";

import { useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { engagements } from "@/lib/dummy-data";
import { formatRelativeTime } from "@/lib/utils";

const stageTone: Record<string, "verified" | "modelled" | "brand" | "default"> = {
  Discovery: "default",
  "Vendor Selection": "brand",
  "Solution Workspace": "modelled",
  "Solution Review": "modelled",
  "Closed - Won": "verified",
};

export default function AdminBuyersPage() {
  const [query, setQuery] = useState("");
  const filtered = engagements.filter((e) => e.buyerName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <PageHeader eyebrow="Management" title="Buyers" description="All buyer organizations exploring vendor solutions." />

      <div className="mb-5 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input placeholder="Search buyers..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs font-medium uppercase tracking-wide text-subtle">
                <th className="px-5 py-3">Buyer</th>
                <th className="px-5 py-3">Industry</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3">Fit score</th>
                <th className="px-5 py-3">Last active</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={e.buyerName} size="sm" color="accent" />
                      <p className="font-medium text-foreground">{e.buyerName}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted">{e.industry}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={stageTone[e.stage] ?? "default"} size="sm">{e.stage}</Badge>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-brand-600 dark:text-brand-400">{e.fitScore}%</td>
                  <td className="px-5 py-3.5 text-muted">{formatRelativeTime(e.lastActive)}</td>
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
    </div>
  );
}
