"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Mail, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { getVendorById, getVendorRecommendationsForVendor, countDraftCapabilities, type VendorDetailRow } from "@/lib/api/vendor-lookup";
import { updateVendorProfile } from "@/lib/api/account";
import { getStoredVendorId, setStoredVendorName } from "@/lib/vendor-session";
import { cn } from "@/lib/utils";

const industryOptions = ["BFSI", "Healthcare", "Manufacturing", "Retail", "SaaS", "Government", "Logistics", "Other"];

export default function VendorProfilePage() {
  const vendorId = getStoredVendorId();
  const { email } = useAuthSession();

  const [vendor, setVendor] = useState<VendorDetailRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [hq, setHq] = useState("");
  const [employeeRange, setEmployeeRange] = useState("");

  const [capabilityCount, setCapabilityCount] = useState(0);
  const [buyerCount, setBuyerCount] = useState(0);

  useEffect(() => {
    if (!vendorId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [v, recs, capCount] = await Promise.all([
          getVendorById(vendorId!),
          getVendorRecommendationsForVendor(vendorId!),
          countDraftCapabilities(vendorId!).catch(() => 0),
        ]);
        if (cancelled) return;
        if (v) {
          setVendor(v);
          setCompanyName(v.companyName);
          setIndustry(v.industry ?? industryOptions[0]);
          setWebsite(v.website ?? "");
          setTagline(v.tagline ?? "");
          setDescription(v.description ?? "");
          setHq(v.hq ?? "");
          setEmployeeRange(v.employeeRange ?? "");
        }
        setBuyerCount(recs.length);
        setCapabilityCount(capCount);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateVendorProfile({
        companyName: companyName.trim(),
        industry,
        website: website.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        hq: hq.trim(),
        employeeRange: employeeRange.trim(),
      });
      setVendor((prev) =>
        prev
          ? { ...prev, companyName: updated.companyName, industry: updated.industry, website: updated.website, tagline: updated.tagline, description: updated.description, hq: updated.hq, employeeRange: updated.employeeRange }
          : prev
      );
      setStoredVendorName(updated.companyName);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (!vendorId) {
    return (
      <div>
        <PageHeader eyebrow="Account" title="Your profile" description="Register your solution first." />
        <Card className="max-w-md p-6 text-center">
          <p className="text-sm text-muted">No vendor record linked to your account yet.</p>
          <Link href="/vendor/onboarding" className={cn(buttonVariants({ variant: "primary" }), "mt-4")}>
            Go to onboarding
          </Link>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <AgentWaitingState variant="fullpage" title="Loading your profile" />
      </div>
    );
  }

  const checklist = [
    { label: "Sources submitted", done: capabilityCount > 0 },
    { label: "Capabilities published", done: vendor?.verificationStatus === "verified" },
    { label: "Engaging with buyers", done: buyerCount > 0 },
  ];

  return (
    <div>
      <PageHeader eyebrow="Account" title="Your profile" description="Manage your company details and see where you are in the process." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Company details</CardTitle>
            <CardDescription>Shown to buyers browsing the vendor catalog.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="companyName">Company name</Label>
                  <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="industry">Primary industry</Label>
                  <Select id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                    {industryOptions.map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Cloud transformation, verified end to end." />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourcompany.com" />
                </div>
                <div>
                  <Label htmlFor="hq">Headquarters</Label>
                  <Input id="hq" value={hq} onChange={(e) => setHq(e.target.value)} placeholder="Bengaluru, India" />
                </div>
              </div>
              <div>
                <Label htmlFor="employeeRange">Company size</Label>
                <Input id="employeeRange" value={employeeRange} onChange={(e) => setEmployeeRange(e.target.value)} placeholder="500-1,000" />
              </div>

              {error && <p className="text-sm text-escalated">{error}</p>}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" loading={saving} disabled={saving}>
                  <Save className="h-4 w-4" /> Save changes
                </Button>
                {saved && <span className="text-sm text-verified">Saved.</span>}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              <p className="flex items-center gap-2 text-sm text-muted">
                <Mail className="h-3.5 w-3.5" /> {email ?? "—"}
              </p>
              {vendor && (
                <Badge variant={vendor.verificationStatus === "verified" ? "verified" : "modelled"} size="sm" className="capitalize">
                  {vendor.verificationStatus}
                </Badge>
              )}
              {!vendor?.email && (
                <p className="text-xs text-subtle">This vendor record isn&apos;t linked to your login email yet — it links automatically the next time you submit sources.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Your progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-sm">
                  {item.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-verified" /> : <Circle className="h-4 w-4 shrink-0 text-subtle" />}
                  <span className={item.done ? "text-foreground" : "text-muted"}>{item.label}</span>
                </div>
              ))}
              <Link href="/vendor" className="mt-2 inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                View full dashboard
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
