"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  FileText,
  Globe,
  Loader2,
  PenLine,
  Sheet as SheetIcon,
  UploadCloud,
  FileType2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { vendorSources as initialSources } from "@/lib/dummy-data";
import type { ProcessingStatus, SourceType, VendorSource } from "@/lib/types";
import { cn } from "@/lib/utils";

const sourceIcon: Record<SourceType, React.ElementType> = {
  website: Globe,
  pdf: FileText,
  ppt: FileType2,
  doc: FileText,
  spreadsheet: SheetIcon,
  manual: PenLine,
  other: FileText,
};

const statusConfig: Record<ProcessingStatus, { label: string; variant: "verified" | "modelled" | "escalated" | "default" }> = {
  completed: { label: "Completed", variant: "verified" },
  processing: { label: "Processing", variant: "modelled" },
  pending: { label: "Pending", variant: "default" },
  failed: { label: "Failed", variant: "escalated" },
};

export default function VendorSourcesPage() {
  const [sources, setSources] = useState<VendorSource[]>(initialSources);
  const [websiteUrl, setWebsiteUrl] = useState("");

  function addSource(partial: Pick<VendorSource, "sourceType" | "label" | "detail">) {
    const id = `src-local-${Date.now()}`;
    const newSource: VendorSource = {
      id,
      vendorId: "v-cloudnova",
      processingStatus: "processing",
      uploadedAt: new Date().toISOString(),
      ...partial,
    };
    setSources((s) => [newSource, ...s]);
    setTimeout(() => {
      setSources((s) =>
        s.map((src) => (src.id === id ? { ...src, processingStatus: "completed", extractedCount: Math.floor(Math.random() * 15) + 4 } : src))
      );
    }, 2400);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const type: SourceType = ext === "pdf" ? "pdf" : ["doc", "docx"].includes(ext) ? "doc" : ["ppt", "pptx"].includes(ext) ? "ppt" : ["xls", "xlsx", "csv"].includes(ext) ? "spreadsheet" : "other";
      addSource({ sourceType: type, label: file.name, detail: `${(file.size / 1024).toFixed(0)} KB · uploaded just now` });
    });
    e.target.value = "";
  }

  function handleAddWebsite() {
    if (!websiteUrl.trim()) return;
    addSource({ sourceType: "website", label: websiteUrl, detail: "Queued for crawl" });
    setWebsiteUrl("");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Phase 1 — Vendor Onboarding"
        title="Source material"
        description="Provide your website, documents, and pricing sheets. The Vendor Intelligence Agent extracts and structures your Solution DNA from these sources."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Add website</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <Label htmlFor="url" className="sr-only">Website URL</Label>
              <Input id="url" placeholder="https://yourcompany.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
              <Button onClick={handleAddWebsite} className="w-full" variant="secondary">
                <Globe className="h-4 w-4" /> Crawl website
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Upload documents</CardTitle>
              <CardDescription>PDF, PPT, DOC, XLS, CSV</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <label
                htmlFor="file-upload"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface-2 px-4 py-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/20"
              >
                <UploadCloud className="h-6 w-6 text-brand-500" />
                <p className="text-sm font-medium text-foreground">Drop files or click to browse</p>
                <p className="text-xs text-subtle">Up to 25MB per file</p>
              </label>
              <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
            </CardContent>
          </Card>

          <Card className="border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-950/20">
            <CardContent className="pt-5">
              <p className="text-sm font-semibold text-foreground">Direct input</p>
              <p className="mt-2 text-sm text-muted">
                Prefer typing capabilities, pricing rules, and FAQs directly? Add them manually in Solution DNA review.
              </p>
              <a href="/vendor/solution-dna" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
                <PenLine className="h-3.5 w-3.5" /> Add manual entry
              </a>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Uploaded sources ({sources.length})</CardTitle>
            <CardDescription>Every extracted capability retains a link back to its source.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2.5">
              <AnimatePresence initial={false}>
                {sources.map((src) => {
                  const Icon = sourceIcon[src.sourceType];
                  const cfg = statusConfig[src.processingStatus];
                  return (
                    <motion.div
                      key={src.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{src.label}</p>
                        <p className="text-xs text-muted">{src.detail}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {src.extractedCount != null && src.processingStatus === "completed" && (
                          <span className="hidden text-xs text-subtle sm:inline">{src.extractedCount} extracted</span>
                        )}
                        <Badge variant={cfg.variant} size="sm">
                          {src.processingStatus === "processing" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : src.processingStatus === "completed" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : null}
                          {cfg.label}
                        </Badge>
                        <button
                          onClick={() => setSources((s) => s.filter((x) => x.id !== src.id))}
                          className="rounded-md p-1 text-subtle hover:bg-surface-2 hover:text-escalated"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
