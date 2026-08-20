"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, Globe, Mail, MapPin, Sparkles, Users } from "lucide-react";
import { BackButton } from "@/components/layout/back-button";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CapabilityCard } from "@/components/shared/capability-card";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { getVendorRecommendations, type VendorRecommendationRow } from "@/lib/api/buyer-lookup";
import {
  queryApprovedVendorSolutionDna,
  queryPublishedVendorSolutionDna,
  type ApprovedCapability,
  type PublishedVendor,
} from "@/lib/api/buyer-vendor-dna";
import { getVendorById, type VendorDetailRow } from "@/lib/api/vendor-lookup";
import { useBuyerSession } from "@/lib/hooks/use-buyer-session";
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
  // The published Solution DNA snapshot (above) can lag behind edits made on
  // /vendor/profile since then — this is the live vendors row, used as the
  // primary source for identity fields (name, tagline, website, HQ, size) so
  // this page never shows a stale company name after a vendor renames or
  // updates their profile.
  const [vendorDetail, setVendorDetail] = useState<VendorDetailRow | null>(null);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [recommendation, setRecommendation] = useState<VendorRecommendationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { buyerId, vendorId: selectedVendorId } = useBuyerSession();
  const isSelected = vendorId !== null && selectedVendorId === vendorId;

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
        const [approved, published, recs, detail] = await Promise.all([
          queryApprovedVendorSolutionDna(id),
          queryPublishedVendorSolutionDna().catch(() => null),
          buyerId ? getVendorRecommendations(buyerId) : Promise.resolve([]),
          getVendorById(id).catch(() => null),
        ]);
        if (cancelled) return;
        setCapabilities(approved.capabilities.map((c) => toCapability(id, c)));
        setVendor(published?.vendors.find((v) => v.vendorId === id) ?? { vendorId: id, companyName: approved.companyName, industry: null, industries: [], tagline: null, description: null, capabilities: [] });
        setVendorDetail(detail);
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
      <div className="flex min-h-[40vh] items-center justify-center">
        <AgentWaitingState
          variant="fullpage"
          title="Loading vendor profile"
          description="Pulling their published capabilities and evidence."
        />
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

  // vendorDetail (the live vendors row) is the source of truth for identity
  // fields — falls back to the published Solution DNA snapshot only when the
  // live row hasn't loaded, so a vendor rename/profile edit never shows up
  // here as a stale name.
  const companyName = vendorDetail?.companyName ?? vendor.companyName;
  const tagline = vendorDetail?.tagline ?? vendor.tagline;
  const industry = vendorDetail?.industry ?? vendor.industry;
  const industries = vendorDetail?.industries?.length ? vendorDetail.industries : vendor.industries;
  const description = vendorDetail?.description ?? vendor.description;
  const website = vendorDetail?.website ?? null;
  const hq = vendorDetail?.hq ?? null;
  const employeeRange = vendorDetail?.employeeRange ?? null;
  const email = vendorDetail?.email ?? null;

  return (
    <div>
      <BackButton href="/buyer/vendors" label="Back to vendors" className="mb-4" />

      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={companyName} size="lg" className="h-16 w-16 shrink-0 text-lg" />
              <div>
                <p className="text-lg font-bold text-foreground">{companyName}</p>
                <p className="text-sm text-muted">{tagline || "No tagline on file yet."}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 pb-1">
              {recommendation?.fitScore != null && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{recommendation.fitScore}%</p>
                  <p className="text-[10px] uppercase tracking-wide text-subtle">requirement fit</p>
                </div>
              )}
              {isSelected ? (
                <Link href="/buyer/solution" className={cn(buttonVariants({ variant: "primary" }))}>
                  <Sparkles className="h-4 w-4" /> View my solution
                </Link>
              ) : (
                <Link href="/buyer/vendors" className={cn(buttonVariants({ variant: "secondary" }))}>
                  Confirm this vendor
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs text-muted">
            {industry && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> {industry}
              </span>
            )}
            {hq && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {hq}
              </span>
            )}
            {employeeRange && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> {employeeRange} employees
              </span>
            )}
            {email && (
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {email}
              </span>
            )}
            {website && (
              <a
                href={website.startsWith("http") ? website : `https://${website}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-brand-600 hover:underline dark:text-brand-400"
              >
                <Globe className="h-3.5 w-3.5" /> {website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Published capabilities" value={String(capabilities.length)} icon={Sparkles} tone="brand" index={0} />
        <StatCard
          label="Verified capabilities"
          value={String(capabilities.filter((c) => c.verificationStatus === "verified").length)}
          icon={CheckCircle2}
          tone="verified"
          index={1}
        />
        <StatCard
          label="Requirement fit"
          value={recommendation?.fitScore != null ? `${recommendation.fitScore}%` : "—"}
          icon={Users}
          tone="accent"
          index={2}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {description && (
            <Card>
              <CardHeader>
                <CardTitle>About {companyName}</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-sm leading-relaxed text-muted">{description}</p>
                {industries.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {industries.map((ind) => (
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
                <p className="text-sm text-muted">No approved capabilities published for {companyName} yet.</p>
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
