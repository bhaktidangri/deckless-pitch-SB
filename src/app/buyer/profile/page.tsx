"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Mail, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { useBuyerSession } from "@/lib/hooks/use-buyer-session";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { getBuyer, getBuyerRequirements, getActiveVendorSelection, getBuyerWorkflowRunHistory, type BuyerRow } from "@/lib/api/buyer-lookup";
import { updateBuyerProfile } from "@/lib/api/account";
import { cn } from "@/lib/utils";

const industryOptions = ["BFSI", "Healthcare", "Manufacturing", "Retail", "SaaS", "Government", "Logistics", "Other"];

export default function BuyerProfilePage() {
  const { buyerId } = useBuyerSession();
  const { email } = useAuthSession();

  const [buyer, setBuyer] = useState<BuyerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");

  const [hasRequirements, setHasRequirements] = useState(false);
  const [hasVendor, setHasVendor] = useState(false);
  const [hasCompletedRun, setHasCompletedRun] = useState(false);

  useEffect(() => {
    if (!buyerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [b, reqs, selection, runs] = await Promise.all([
          getBuyer(buyerId!),
          getBuyerRequirements(buyerId!),
          getActiveVendorSelection(buyerId!),
          getBuyerWorkflowRunHistory(buyerId!, 5),
        ]);
        if (cancelled) return;
        if (b) {
          setBuyer(b);
          setCompanyName(b.companyName);
          setIndustry(b.industry ?? industryOptions[0]);
          setCompanySize(b.companySize ? String(b.companySize) : "");
          setContactName(b.contactName ?? "");
          setContactRole(b.contactRole ?? "");
        }
        setHasRequirements(reqs.length > 0);
        setHasVendor(!!selection);
        setHasCompletedRun(runs.some((r) => r.status === "completed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [buyerId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateBuyerProfile({
        companyName: companyName.trim(),
        industry,
        companySize: companySize.trim() ? Number(companySize) : undefined,
        contactName: contactName.trim(),
        contactRole: contactRole.trim(),
      });
      setBuyer((prev) => (prev ? { ...prev, companyName: updated.companyName, industry: updated.industry, companySize: updated.companySize, contactName: updated.contactName, contactRole: updated.contactRole } : prev));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (!buyerId) {
    return (
      <div>
        <PageHeader eyebrow="Account" title="Your profile" description="Start a discovery submission first." />
        <Card className="max-w-md p-6 text-center">
          <p className="text-sm text-muted">No buyer record linked to your account yet.</p>
          <Link href="/buyer/discover" className={cn(buttonVariants({ variant: "primary" }), "mt-4")}>
            Go to Discover
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
    { label: "Discovery submitted", done: hasRequirements },
    { label: "Vendor selected", done: hasVendor },
    { label: "A solution run completed", done: hasCompletedRun },
  ];

  return (
    <div>
      <PageHeader eyebrow="Account" title="Your profile" description="Manage your company details and see where you are in the process." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Company details</CardTitle>
            <CardDescription>Visible to the vendor you&apos;re working with.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="companyName">Company name</Label>
                  <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                    {industryOptions.map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="companySize">Company size</Label>
                  <Input id="companySize" type="number" min={1} value={companySize} onChange={(e) => setCompanySize(e.target.value)} placeholder="500" />
                </div>
                <div>
                  <Label htmlFor="contactName">Your name</Label>
                  <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="contactRole">Your role</Label>
                <Input id="contactRole" value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="VP of Technology" />
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
            <CardContent className="pt-2">
              <p className="flex items-center gap-2 text-sm text-muted">
                <Mail className="h-3.5 w-3.5" /> {email ?? "—"}
              </p>
              {!buyer?.email && (
                <p className="mt-2 text-xs text-subtle">This buyer record isn&apos;t linked to your login email yet — it links automatically the next time you submit a discovery form.</p>
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
              <Link href="/buyer" className="mt-2 inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                View full dashboard
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
