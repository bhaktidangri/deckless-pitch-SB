"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, Building2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { primaryVendor } from "@/lib/dummy-data";
import { cn } from "@/lib/utils";

const checklist = [
  { label: "Company profile", done: true },
  { label: "Add source material", done: true },
  { label: "Review Solution DNA", done: false },
  { label: "Go live to buyers", done: false },
];

const industryOptions = ["BFSI", "Healthcare", "Manufacturing", "Retail", "SaaS", "Government", "Logistics"];

export default function VendorOnboardingPage() {
  const [selected, setSelected] = useState<string[]>(primaryVendor.industries);
  const [saved, setSaved] = useState(false);

  function toggle(ind: string) {
    setSelected((s) => (s.includes(ind) ? s.filter((i) => i !== ind) : [...s, ind]));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Phase 1 — Vendor Onboarding"
        title="Company profile"
        description="This information anchors your Vendor Solution DNA and helps buyers understand who they're evaluating."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Company details
            </CardTitle>
            <CardDescription>Prefilled from your registration — update anytime.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Company name</Label>
                  <Input id="name" defaultValue={primaryVendor.name} required />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" defaultValue={primaryVendor.website} required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="industry">Primary industry</Label>
                  <Select id="industry" defaultValue={primaryVendor.industry}>
                    <option>{primaryVendor.industry}</option>
                    <option>Cybersecurity</option>
                    <option>Data & Analytics</option>
                    <option>Managed Cloud Services</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="employees">Company size</Label>
                  <Select id="employees" defaultValue={primaryVendor.employeeRange}>
                    <option>{primaryVendor.employeeRange}</option>
                    <option>1-50</option>
                    <option>50-100</option>
                    <option>1,000+</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Input id="tagline" defaultValue={primaryVendor.tagline} />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" defaultValue={primaryVendor.description} rows={4} />
              </div>
              <div>
                <Label>Target industries</Label>
                <div className="flex flex-wrap gap-2">
                  {industryOptions.map((ind) => (
                    <button
                      type="button"
                      key={ind}
                      onClick={() => toggle(ind)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        selected.includes(ind)
                          ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                          : "border-border bg-surface text-muted hover:border-border-strong"
                      )}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit">{saved ? "Saved!" : "Save changes"}</Button>
                <Link href="/vendor/sources" className={cn(buttonVariants({ variant: "secondary" }))}>
                  Continue to sources <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {checklist.map((step) => (
                <div key={step.label} className="flex items-center gap-2.5">
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-verified" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-subtle" />
                  )}
                  <span className={cn("text-sm", step.done ? "text-foreground" : "text-muted")}>{step.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-950/20">
            <CardContent className="pt-5">
              <p className="text-sm font-semibold text-foreground">What happens next?</p>
              <p className="mt-2 text-sm text-muted">
                Once your profile and sources are in, the Vendor Intelligence Agent extracts, classifies, and
                source-links every capability into your Solution DNA for your review.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
