"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { getAllVendors, type VendorDetailRow } from "@/lib/api/admin-lookup";

export default function AdminVendorsPage() {
  const [query, setQuery] = useState("");
  const [vendors, setVendors] = useState<VendorDetailRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAllVendors()
      .then((v) => !cancelled && setVendors(v))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = vendors.filter((v) => v.companyName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <PageHeader eyebrow="Management" title="Vendors" description="All vendor organizations registered on the platform." />

      <div className="mb-5 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input placeholder="Search vendors..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {loading ? (
        <AgentWaitingState variant="card" title="Loading vendors" />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">{vendors.length === 0 ? "No vendors registered yet." : `No vendor matches "${query}".`}</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs font-medium uppercase tracking-wide text-subtle">
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Industry</th>
                  <th className="px-5 py-3">HQ</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={v.companyName} size="sm" color="brand" />
                        <div>
                          <p className="font-medium text-foreground">{v.companyName}</p>
                          {v.website && <p className="text-xs text-subtle">{v.website}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{v.industry ?? "—"}</td>
                    <td className="px-5 py-3.5 text-muted">{v.hq ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={v.verificationStatus === "verified" ? "verified" : "modelled"} size="sm" className="capitalize">
                        {v.verificationStatus}
                      </Badge>
                    </td>
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
