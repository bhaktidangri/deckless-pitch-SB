import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarClock, FileSearch, Mail, TrendingUp, User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { GapCard } from "@/components/shared/gap-card";
import { MatchRow } from "@/components/shared/match-row";
import { FrontierCard } from "@/components/shared/frontier-card";
import {
  buyer,
  capabilityFrontierItems,
  clientRealityProfile,
  engagements,
  gapItems,
  requirements,
  solutionMatches,
} from "@/lib/dummy-data";
import { cn, formatCurrencyINR, formatNumber } from "@/lib/utils";

export default async function VendorBuyerDetailPage(props: PageProps<"/vendor/buyers/[id]">) {
  const { id } = await props.params;
  const engagement = engagements.find((e) => e.id === id);
  if (!engagement) notFound();

  const isMeridian = id === buyer.id;
  const frontierItems = isMeridian ? capabilityFrontierItems : capabilityFrontierItems.slice(0, engagement.frontierOpen);

  return (
    <div>
      <Link href="/vendor/buyers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to buyers
      </Link>

      <PageHeader
        eyebrow={engagement.stage}
        title={engagement.buyerName}
        description={`${engagement.industry} · ${formatNumber(buyer.companySize)} users · Engaged since ${new Date(buyer.createdAt).toLocaleDateString()}`}
        actions={
          <Link href="/vendor/meetings" className={cn(buttonVariants({ variant: "primary" }))}>
            <CalendarClock className="h-4 w-4" /> Prepare handoff
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Client Reality Profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 pt-2 sm:grid-cols-2">
              <ProfileBlock title="Current technology" items={clientRealityProfile.currentTechnology} />
              <ProfileBlock title="Pain points" items={clientRealityProfile.painPoints} tone="escalated" />
              <ProfileBlock title="Goals" items={clientRealityProfile.goals} tone="verified" />
              <ProfileBlock title="Constraints" items={clientRealityProfile.constraints} tone="modelled" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business gaps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {gapItems.map((gap) => (
                <GapCard key={gap.id} gap={gap} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Solution matches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {solutionMatches.map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </CardContent>
          </Card>

          {frontierItems.length > 0 && (
            <Card>
              <CardHeader className="flex-row items-center gap-2">
                <FileSearch className="h-4 w-4 text-escalated" />
                <CardTitle>Capability Frontier for this buyer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {frontierItems.map((item) => (
                  <FrontierCard key={item.id} item={item} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Primary contact</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center gap-3">
                <Avatar name={buyer.contactName} size="lg" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{buyer.contactName}</p>
                  <p className="text-xs text-muted">{buyer.contactRole}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-muted">
                <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> {engagement.buyerName}</p>
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> priya.sharma@meridianretail.com</p>
                <p className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> {formatNumber(buyer.companySize)} employees</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Requirement fit</CardTitle>
              <span className="flex items-center gap-1 text-sm font-bold text-brand-600 dark:text-brand-400">
                <TrendingUp className="h-4 w-4" /> {engagement.fitScore}%
              </span>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
                {requirements.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-2 text-sm">
                    <span className="text-foreground">{r.text}</span>
                    <Badge variant="outline" size="sm" className="shrink-0 capitalize">{r.priority}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-950/20">
            <CardContent className="pt-5">
              <p className="text-sm font-semibold text-foreground">Current infrastructure cost</p>
              <p className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-300">{formatCurrencyINR(clientRealityProfile.currentCostAnnual)}</p>
              <p className="mt-1 text-xs text-muted">per year, before optimization</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProfileBlock({ title, items, tone }: { title: string; items: string[]; tone?: "escalated" | "verified" | "modelled" }) {
  const dot = tone === "escalated" ? "bg-escalated" : tone === "verified" ? "bg-verified" : tone === "modelled" ? "bg-modelled" : "bg-subtle";
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-foreground">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
