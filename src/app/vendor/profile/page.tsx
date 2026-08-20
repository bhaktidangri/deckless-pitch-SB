"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Mail,
  Save,
  Users,
  ArrowUpRight,
  Clock,
  Loader2,
  AlertTriangle,
  Globe,
  MapPin,
  Dna,
  Gauge,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { AgentWaitingState } from "@/components/shared/agent-waiting-state";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import {
  getVendorById,
  getVendorRecommendationsForVendor,
  getBuyerVendorSelectionsForVendor,
  getBuyersByIds,
  countDraftCapabilities,
  type VendorDetailRow,
  type LeadBuyerRow,
} from "@/lib/api/vendor-lookup";
import { updateVendorProfile, linkVendorAccount } from "@/lib/api/account";
import {
  addStoredWorkflowRunId,
  clearPendingSubmission,
  getPendingSubmission,
  getStoredVendorId,
  setPendingSubmission,
  setStoredVendorId,
  setStoredVendorName,
} from "@/lib/vendor-session";
import { POLL_TIMEOUT_MS, pollForNewVendorId, type PollHandle } from "@/lib/vendor-poll";

const industryOptions = ["BFSI", "Healthcare", "Manufacturing", "Retail", "SaaS", "Government", "Logistics", "Other"];

// The single vendor landing page — merges what used to be two separate
// screens (register/submit-sources, and profile management) into one, since
// there's no real reason a vendor should land on a dead-end "no profile yet"
// card and get bounced to a different route just to register. Whether this
// account has a linked vendor yet decides which mode renders:
//   no vendorId  -> registration form; submits fire workflow 1 (crawl+draft)
//   has vendorId -> profile edit form; "Save changes" both updates the
//                   stored fields AND re-triggers workflow 1, so editing the
//                   website/company details actually re-syncs Solution DNA
//                   instead of silently drifting from what was last crawled.
export default function VendorProfilePage() {
  const router = useRouter();
  const { email } = useAuthSession();
  const pollHandleRef = useRef<PollHandle | null>(null);
  useEffect(() => () => pollHandleRef.current?.cancel(), []);

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendor, setVendor] = useState<VendorDetailRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState(industryOptions[0]);
  const [website, setWebsite] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [hq, setHq] = useState("");
  const [employeeRange, setEmployeeRange] = useState("");

  const [capabilityCount, setCapabilityCount] = useState(0);
  const [buyerCount, setBuyerCount] = useState(0);
  const [interested, setInterested] = useState<{ buyer: LeadBuyerRow; fitScore: number | null }[]>([]);

  // Registration-only state (mirrors the old onboarding page) — only used
  // while there's no linked vendor yet.
  const [registerStage, setRegisterStage] = useState<"idle" | "submitting" | "processing" | "timed-out">("idle");
  const [runId, setRunId] = useState<string | null>(null);

  useEffect(() => {
    const id = getStoredVendorId();
    setVendorId(id);
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [v, recs, selections, capCount] = await Promise.all([
          getVendorById(id!),
          getVendorRecommendationsForVendor(id!),
          getBuyerVendorSelectionsForVendor(id!),
          countDraftCapabilities(id!).catch(() => 0),
        ]);
        if (cancelled) return;
        if (v) {
          setVendor(v);
          setStoredVendorName(v.companyName);
          setCompanyName(v.companyName);
          setIndustry(v.industry ?? industryOptions[0]);
          setWebsite(v.website ?? "");
          setTagline(v.tagline ?? "");
          setDescription(v.description ?? "");
          setHq(v.hq ?? "");
          setEmployeeRange(v.employeeRange ?? "");
          // A vendor loaded from the locally-stored vendorId isn't
          // necessarily linked to *this* authenticated session yet (e.g. an
          // existing local vendorId meeting a fresh login) — update-vendor-
          // profile only operates on the session's own linked vendor, so
          // without this it 404s even though the form clearly has a vendor
          // loaded. Link automatically rather than silently failing to save.
          if (!v.email) {
            linkVendorAccount(id!)
              .then(() => getVendorById(id!))
              .then((relinked) => {
                if (!cancelled && relinked) setVendor(relinked);
              })
              .catch(() => {});
          }
        }
        const buyerIds = Array.from(new Set([...recs.map((r) => r.buyerId), ...selections.map((s) => s.buyerId)]));
        const buyers = buyerIds.length > 0 ? await getBuyersByIds(buyerIds) : [];
        if (cancelled) return;
        const list = buyers
          .map((buyer) => ({ buyer, fitScore: recs.find((r) => r.buyerId === buyer.id)?.fitScore ?? null }))
          .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));
        setInterested(list);
        setBuyerCount(buyerIds.length);
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

  // Save changes on an EXISTING vendor: persist the editable fields, then
  // also re-trigger workflow 1 so a changed website/description actually
  // gets re-crawled instead of the Solution DNA silently going stale. The
  // crawl itself is fire-and-forget from this screen's point of view — it
  // runs in the background the same way it does from a fresh registration.
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

      if (website.trim() && vendorId) {
        fetch("/api/vendor-source-submission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vendorId, website: website.trim() }),
        })
          .then((res) => res.json().catch(() => ({}) as Record<string, unknown>))
          .then((data) => {
            const workflowRunId = typeof data?.workflowRunId === "string" ? data.workflowRunId : null;
            if (workflowRunId) addStoredWorkflowRunId(workflowRunId);
          })
          .catch(() => {
            // Non-fatal — the profile fields are already saved; a failed
            // re-crawl trigger just means Solution DNA won't refresh this
            // time, not that anything the vendor typed was lost.
          });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  // Registration flow for a brand-new vendor — identical trigger + poll
  // logic the old /vendor/onboarding page used, just living here now.
  const hasAnySource = website.trim().length > 0;
  const canRegister = companyName.trim() && hasAnySource;

  function goToReviewScreen() {
    const pending = getPendingSubmission();
    if (pending) setPendingSubmission({ ...pending, deadline: Date.now() + POLL_TIMEOUT_MS });
    router.push("/vendor/solution-dna");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!canRegister) return;
    setRegisterStage("submitting");
    setError(null);
    const triggeredAt = new Date().toISOString();

    try {
      const res = await fetch("/api/vendor-source-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          website: website.trim(),
          industry,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Submission failed.");
        setRegisterStage("idle");
        return;
      }

      const workflowRunId = typeof data?.workflowRunId === "string" ? data.workflowRunId : null;
      setRunId(workflowRunId);
      if (workflowRunId) addStoredWorkflowRunId(workflowRunId);
      setStoredVendorName(companyName.trim());
      setRegisterStage("processing");
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      setPendingSubmission({ kind: "new-vendor", companyName: companyName.trim(), afterIso: triggeredAt, deadline });
      pollHandleRef.current = pollForNewVendorId(
        companyName.trim(),
        triggeredAt,
        deadline,
        (foundVendorId) => {
          setStoredVendorId(foundVendorId);
          linkVendorAccount(foundVendorId).catch(() => {});
          clearPendingSubmission();
          router.push("/vendor/solution-dna");
        },
        () => setRegisterStage("timed-out")
      );
    } catch {
      setError("Could not reach the submission endpoint. Check your connection and try again.");
      setRegisterStage("idle");
    }
  }

  if (!vendorId) {
    if (registerStage === "processing" || registerStage === "timed-out") {
      return (
        <div>
          <PageHeader
            eyebrow="Milestone 1 — Ingest Vendor Sources and Build DNA Draft"
            title="Analyzing your submission…"
            description="Crawling your site feeds the Vendor Intelligence Agent, which consolidates what it finds into your Solution DNA draft."
          />
          <Card className="max-w-md p-6 text-center">
            {registerStage === "processing" ? (
              <>
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-500" />
                <p className="mt-3 text-sm text-muted">This can take a minute or two while the agent works.</p>
                {runId && <p className="mt-2 font-mono text-[11px] text-subtle">run {runId}</p>}
              </>
            ) : (
              <>
                <Clock className="mx-auto h-6 w-6 text-modelled" />
                <p className="mt-3 text-sm font-medium text-foreground">Still processing after a few minutes.</p>
                <p className="mt-1 text-sm text-muted">
                  Your submission is running — check{" "}
                  <button className="text-brand-600 underline dark:text-brand-400" onClick={goToReviewScreen}>
                    the review screen
                  </button>{" "}
                  — it keeps checking automatically and loads your draft the moment it&apos;s ready.
                </p>
                {runId && <p className="mt-2 font-mono text-[11px] text-subtle">run {runId}</p>}
              </>
            )}
          </Card>
        </div>
      );
    }

    return (
      <div>
        <PageHeader
          eyebrow="Account"
          title="Register your solution"
          description="Provide your company details plus a website URL — this registers your vendor account and kicks off extraction into your Solution DNA draft."
        />
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Company &amp; sources</CardTitle>
            <CardDescription>Company name registers you as a new vendor on your first submission.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Company name</Label>
                  <Input id="name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Cloud Inc." required />
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
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Short description of what you offer." />
              </div>
              <div>
                <Label htmlFor="website">Website URL (crawled for capability extraction)</Label>
                <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourcompany.com" required />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-escalated-border bg-escalated-bg px-3 py-2.5 text-sm text-escalated">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={!canRegister || registerStage === "submitting"} loading={registerStage === "submitting"}>
                  {registerStage === "submitting" ? "Submitting…" : "Register & submit"}
                </Button>
              </div>
            </form>
          </CardContent>
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

  const completenessFields = [companyName, industry, website, tagline, description, hq, employeeRange];
  const completeness = Math.round((completenessFields.filter((f) => f.trim().length > 0).length / completenessFields.length) * 100);

  return (
    <div>
      <PageHeader eyebrow="Account" title="Your profile" description="Manage your company details and see where you are in the process." />

      <Card className="mb-6 overflow-hidden">
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <Avatar name={companyName || "Vendor"} size="lg" className="h-16 w-16 shrink-0 text-lg" />
            <div>
              <p className="text-lg font-bold text-foreground">{companyName || "Your company"}</p>
              <p className="text-sm text-muted">{tagline || "Add a tagline to introduce your solution."}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {email ?? "—"}
            </span>
            {industry && (
              <span className="flex items-center gap-1.5">
                <Dna className="h-3.5 w-3.5" /> {industry}
              </span>
            )}
            {hq && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {hq}
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
          {!vendor?.email && (
            <p className="mt-3 text-xs text-subtle">This vendor record isn&apos;t linked to your login email yet — it links automatically the next time you submit sources.</p>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Capabilities" value={String(capabilityCount)} icon={Dna} tone="brand" index={0} />
        <StatCard label="Buyer interest" value={String(buyerCount)} icon={Users} tone="accent" index={1} />
        <StatCard label="Profile completeness" value={`${completeness}%`} icon={Gauge} tone="escalated" index={2} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Company details</CardTitle>
            <CardDescription>Shown to buyers browsing the vendor catalog. Saving re-syncs your Solution DNA from your website.</CardDescription>
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
                {saved && <span className="text-sm text-verified">Saved — re-syncing Solution DNA.</span>}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
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

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Buyer interest
              </CardTitle>
              <span className="text-lg font-bold text-foreground">{interested.length}</span>
            </CardHeader>
            <CardContent className="space-y-1 pt-2">
              {interested.length === 0 ? (
                <p className="py-2 text-sm text-muted">No buyers are exploring your solution yet.</p>
              ) : (
                interested.slice(0, 5).map(({ buyer, fitScore }) => (
                  <Link
                    key={buyer.id}
                    href={`/vendor/buyers/${buyer.id}`}
                    className="-mx-1 flex items-center gap-2.5 rounded-lg px-1 py-2 text-sm transition-colors hover:bg-surface-2"
                  >
                    <Avatar name={buyer.companyName} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-foreground">{buyer.companyName}</span>
                    {fitScore != null && <span className="shrink-0 text-xs font-semibold text-brand-600 dark:text-brand-400">{fitScore}%</span>}
                  </Link>
                ))
              )}
              <Link href="/vendor/buyers" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                Reach out to buyers <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
