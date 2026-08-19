import { NextResponse } from "next/server";
import { triggerVendorSourceSubmission, YoxaTriggerError } from "@/lib/api/yoxa-trigger";

interface SubmissionBody {
  vendorId?: string;
  companyName?: string;
  website?: string;
  industry?: string;
  description?: string;
}

// Server-side trigger for vendor_source_submission (PRD Section 5.1). Kept
// server-only because YOXA_DEPLOYMENT_SECRET must not reach the browser.
// Composes the intake form's fields into the trigger_text the Yoxa
// deployment actually accepts. The "Ingest Vendor Documents and Direct
// Inputs" tool has been removed from the redeployed workflow — Milestone 1
// is now crawl-only, so there's no direct-text/document channel to compose
// here anymore; a website URL is the sole capability source.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as SubmissionBody;

  const lines: string[] = [];
  if (body.vendorId) {
    lines.push(
      `Returning vendor — vendor.id ${body.vendorId} already exists from an earlier submission. Reuse this vendor record instead of registering a new one.`
    );
  }
  if (body.companyName) lines.push(`Company name: ${body.companyName}`);
  if (body.website) lines.push(`Website: ${body.website}`);
  if (body.industry) lines.push(`Primary industry: ${body.industry}`);
  if (body.description) lines.push(`Description: ${body.description}`);

  if (!body.website?.trim()) {
    return NextResponse.json({ error: "A website URL is required — crawling is the only intake source." }, { status: 400 });
  }

  const triggerText = lines.join("\n").trim();

  try {
    const result = await triggerVendorSourceSubmission(triggerText);
    return NextResponse.json(result, { status: 202 });
  } catch (e) {
    if (e instanceof YoxaTriggerError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status === 503 ? 503 : 502 });
    }
    return NextResponse.json({ error: "Could not submit to the vendor workflow trigger." }, { status: 502 });
  }
}
