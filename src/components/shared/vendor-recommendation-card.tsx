import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { VendorRecommendationRow } from "@/lib/api/buyer-lookup";
import type { PublishedVendor } from "@/lib/api/buyer-vendor-dna";
import { cn } from "@/lib/utils";

// Real-data equivalent of vendor-match-card.tsx — only renders fields the
// workflow actually produces (fitScore, keyMatch from vendor_recommendations;
// companyName/industry/industries/tagline/description from the published
// Solution DNA query). No employeeRange/hq/foundedYear — those were dummy
// fields with nothing behind them.
export function VendorRecommendationCard({
  recommendation,
  vendor,
  href,
}: {
  recommendation: VendorRecommendationRow;
  vendor: PublishedVendor | undefined;
  href: string;
}) {
  const fit = recommendation.fitScore ?? 0;
  return (
    <Card className="group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
            {(vendor?.companyName ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{vendor?.companyName ?? "Vendor"}</h3>
            <p className="text-xs text-muted">{vendor?.industry ?? "—"}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-lg font-bold text-brand-600 dark:text-brand-400">{fit}%</span>
          <span className="text-[10px] uppercase tracking-wide text-subtle">fit</span>
        </div>
      </div>

      {vendor?.description && (
        <div className="px-5">
          <p className="text-sm text-muted line-clamp-2">{vendor.description}</p>
        </div>
      )}

      {vendor && vendor.industries.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 px-5">
          {vendor.industries.slice(0, 3).map((ind) => (
            <Badge key={ind} variant="outline" size="sm">
              {ind}
            </Badge>
          ))}
        </div>
      )}

      {recommendation.keyMatch && (
        <div className="mx-5 mb-4 mt-4 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
          Key match: <span className="font-medium">{recommendation.keyMatch}</span>
        </div>
      )}

      <div className="mt-auto flex gap-2 border-t border-border p-3">
        <Link href={href} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "flex-1")}>
          View profile <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}
