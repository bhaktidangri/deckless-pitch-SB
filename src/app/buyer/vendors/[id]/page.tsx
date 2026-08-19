"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Globe, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CapabilityCard } from "@/components/shared/capability-card";
import { getVendorRecommendations, type VendorRecommendationRow } from "@/lib/api/buyer-lookup";
import {
  queryApprovedVendorSolutionDna,
  queryPublishedVendorSolutionDna,
  type ApprovedCapability,
  type PublishedVendor,
} from "@/lib/api/buyer-vendor-dna";
import { getStoredBuyerId, getStoredSelectedVendorId } from "@/lib/buyer-session";
import type { Capability, SourceType } from "@/lib/types";
import { cn } from "@/lib/utils";

function toCapability(vendorId: string, c: ApprovedCapability): Capability {
  return {
    id: c.id,
    vendorId,
    name: c.name,
    description: c.description ?? "",
    category: c.category,
    verificationStatus: c.verificationStatus,
    tags: c.tags,
    evidence: c.evidence.map((e) => ({
      sourceLabel: e.sourceLabel ?? "Source",
      sourceType: (e.sourceType as SourceType) ?? "other",
      snippet: e.sourceText ?? "",
    })),
  };
}

export default function VendorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendor, setVendor] = useState<PublishedVendor | null>(null);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [recommendation, setRecommendation] = useState<VendorRecommendationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buyerId = getStoredBuyerId();
  const isSelected = vendorId !== null && getStoredSelectedVendorId() === vendorId;

  useEffect(() => {
    let cancelled = false;
    params.then(({ id }) => {
      if (cancelled) return;
      setVendorId(id);
      load(id);
    });
    async function load(id: string) {
      setLoading(true);
      setError(null);
      try {
        const [approved, published, recs] = await Promise.all([
          queryApprovedVendorSolutionDna(id),
          queryPublishedVendorSolutionDna().catch(() => null),
          buyerId ? getVendorRecommendations(buyerId) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setCapabilities(approved.capabilities.map((c) => toCapability(id, c)));
        setVendor(published?.vendors.find((v) => v.vendorId === id) ?? { vendorId: id, companyName: approved.companyName, industry: null, industries: [], tagline: null, description: null, capabilities: [] });
        setRecommendation(recs.find((r) => r.vendorId === id) ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load this vendor.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        <p className="text-sm text-muted">Loading vendor profile…</p>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <Card className="max-w-md p-6 text-center">
        <p className="text-sm text-escalated">{error ?? "Vendor not found."}</p>
      </Card>
    );
  }

  return (
    <div>
      <Link href="/buyer/vendors" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to vendors
      </Link>

      <div className="mb-8 flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-xl font-bold text-white">
            {vendor.companyName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">{vendor.companyName}</h1>
            {vendor.tagline && <p className="text-sm text-muted">{vendor.tagline}</p>}
            {vendor.industry && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-subtle">
                <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {vendor.industry}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          {recommendation?.fitScore != null && (
            <div className="text-right">
              <p className="text-3xl font-bold text-brand-600 dark:text-brand-400">{recommendation.fitScore}%</p>
              <p className="text-[11px] uppercase tracking-wide text-subtle">requirement fit</p>
            </div>
          )}
          {isSelected ? (
            <Link href="/buyer/solution" className={cn(buttonVariants({ variant: "primary" }))}>
              <Sparkles className="h-4 w-4" /> View my personalized solution
            </Link>
          ) : (
            <Link href="/buyer/vendors" className={cn(buttonVariants({ variant: "secondary" }))}>
              Confirm this vendor
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {vendor.description && (
            <Card>
              <CardHeader>
                <CardTitle>About {vendor.companyName}</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-sm leading-relaxed text-muted">{vendor.description}</p>
                {vendor.industries.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {vendor.industries.map((ind) => (
                      <Badge key={ind} variant="outline">{ind}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {capabilities.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Published capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {capabilities.map((c) => (
                  <CapabilityCard key={c.id} capability={c} />
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted">No approved capabilities published for {vendor.companyName} yet.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Why this fit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {recommendation?.keyMatch ? (
                <FitReason text={recommendation.keyMatch} />
              ) : (
                <p className="text-sm text-subtle">No ranking reason on file yet.</p>
              )}
              {recommendation?.reason && <FitReason text={recommendation.reason} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FitReason({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-foreground">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
      {text}
    </div>
  );
}
