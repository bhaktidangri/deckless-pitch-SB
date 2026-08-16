import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CheckCircle2, Globe, MapPin, Sparkles, Users2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CapabilityCard } from "@/components/shared/capability-card";
import { capabilities, vendors } from "@/lib/dummy-data";
import { cn } from "@/lib/utils";

export default async function VendorProfilePage(props: PageProps<"/buyer/vendors/[id]">) {
  const { id } = await props.params;
  const vendor = vendors.find((v) => v.slug === id || v.id === id);
  if (!vendor) notFound();

  const vendorCapabilities = capabilities.filter((c) => c.vendorId === vendor.id);
  const isPrimary = vendor.id === "v-cloudnova";

  return (
    <div>
      <Link href="/buyer/vendors" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to vendors
      </Link>

      <div className="mb-8 flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-xl font-bold text-white">
            {vendor.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">{vendor.name}</h1>
            <p className="text-sm text-muted">{vendor.tagline}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-subtle">
              <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {vendor.website}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {vendor.hq}</span>
              <span className="flex items-center gap-1"><Users2 className="h-3.5 w-3.5" /> {vendor.employeeRange}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="text-right">
            <p className="text-3xl font-bold text-brand-600 dark:text-brand-400">{vendor.fitScore}%</p>
            <p className="text-[11px] uppercase tracking-wide text-subtle">requirement fit</p>
          </div>
          {isPrimary ? (
            <Link href="/buyer/solution" className={cn(buttonVariants({ variant: "primary" }))}>
              <Sparkles className="h-4 w-4" /> View my personalized solution
            </Link>
          ) : (
            <Link href="/buyer/discover" className={cn(buttonVariants({ variant: "secondary" }))}>
              Start discovery with {vendor.name}
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>About {vendor.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-sm leading-relaxed text-muted">{vendor.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {vendor.industries.map((ind) => (
                  <Badge key={ind} variant="outline">{ind}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {vendorCapabilities.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Verified capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {vendorCapabilities.map((c) => (
                  <CapabilityCard key={c.id} capability={c} />
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted">
                  Solution DNA for {vendor.name} hasn&apos;t been fully explored in this demo yet. Start a
                  discovery conversation to build your personalized comparison.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Why this fit score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <FitReason text={vendor.keyMatch ?? "Aligned with your industry"} />
              <FitReason text={`Founded ${vendor.foundedYear}, ${vendor.employeeRange} employees`} />
              <FitReason text={`Active across ${vendor.industries.length} of your relevant industries`} />
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
