import Link from "next/link";
import { ArrowUpRight, MapPin, Users2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { Vendor } from "@/lib/types";
import { cn } from "@/lib/utils";

const colorRing: Record<string, string> = {
  brand: "from-brand-500 to-accent-500",
  accent: "from-accent-500 to-brand-400",
  verified: "from-verified to-accent-500",
  modelled: "from-modelled to-brand-400",
};

export function VendorMatchCard({ vendor, href }: { vendor: Vendor; href: string }) {
  const fit = vendor.fitScore ?? 0;
  return (
    <Card className="group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white",
              colorRing[vendor.color] ?? colorRing.brand
            )}
          >
            {vendor.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{vendor.name}</h3>
            <p className="text-xs text-muted">{vendor.industry}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-lg font-bold text-brand-600 dark:text-brand-400">{fit}%</span>
          <span className="text-[10px] uppercase tracking-wide text-subtle">fit</span>
        </div>
      </div>

      <div className="px-5">
        <p className="text-sm text-muted line-clamp-2">{vendor.description}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5 px-5">
        {vendor.industries.slice(0, 3).map((ind) => (
          <Badge key={ind} variant="outline" size="sm">
            {ind}
          </Badge>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-border px-5 py-3 text-xs text-subtle">
        <span className="flex items-center gap-1">
          <Users2 className="h-3.5 w-3.5" /> {vendor.employeeRange}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> {vendor.hq}
        </span>
      </div>

      {vendor.keyMatch && (
        <div className="mx-5 mb-4 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
          Key match: <span className="font-medium">{vendor.keyMatch}</span>
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
