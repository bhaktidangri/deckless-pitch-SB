"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileSearch, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { engagements as allEngagements } from "@/lib/dummy-data";
import { formatRelativeTime } from "@/lib/utils";

const stageTone: Record<string, "verified" | "modelled" | "brand" | "default"> = {
  Discovery: "default",
  "Vendor Selection": "brand",
  "Solution Workspace": "modelled",
  "Solution Review": "modelled",
  "Closed - Won": "verified",
};

export default function VendorBuyersPage() {
  const [query, setQuery] = useState("");
  const filtered = allEngagements.filter((e) => e.buyerName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <PageHeader
        eyebrow="Engagement"
        title="Buyers"
        description="Every buyer currently exploring CloudNova's personalized solution, ranked by requirement fit."
      />

      <div className="mb-5 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input placeholder="Search buyers..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="grid gap-3">
        {filtered.map((e) => (
          <Link key={e.id} href={`/vendor/buyers/${e.id}`}>
            <Card className="group transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={e.buyerName} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{e.buyerName}</p>
                    <p className="text-xs text-muted">{e.industry}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                  <Badge variant={stageTone[e.stage] ?? "default"}>{e.stage}</Badge>
                  {e.frontierOpen > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-escalated">
                      <FileSearch className="h-3.5 w-3.5" /> {e.frontierOpen} open
                    </span>
                  )}
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{e.fitScore}%</p>
                    <p className="text-[10px] uppercase tracking-wide text-subtle">fit</p>
                  </div>
                  <span className="hidden text-xs text-subtle md:block">{formatRelativeTime(e.lastActive)}</span>
                  <ArrowUpRight className="h-4 w-4 text-subtle transition-colors group-hover:text-brand-500" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
