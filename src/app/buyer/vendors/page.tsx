"use client";

import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { VendorMatchCard } from "@/components/shared/vendor-match-card";
import { vendors } from "@/lib/dummy-data";

export default function BuyerVendorsPage() {
  const [query, setQuery] = useState("");
  const sorted = [...vendors].sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));
  const filtered = sorted.filter(
    (v) => v.name.toLowerCase().includes(query.toLowerCase()) || v.industry.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        eyebrow="Vendor Discovery"
        title="Recommended vendors"
        description="Ranked by AI fit score against your captured requirements: reduce cost, migrate legacy architecture, and scale without downtime."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input placeholder="Search vendors or industries..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Badge variant="brand">
          <Sparkles className="h-3 w-3" /> AI-ranked by requirement fit
        </Badge>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((v) => (
          <VendorMatchCard key={v.id} vendor={v} href={`/buyer/vendors/${v.slug}`} />
        ))}
      </div>
    </div>
  );
}
