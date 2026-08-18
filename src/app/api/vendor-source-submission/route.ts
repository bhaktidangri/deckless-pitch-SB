import { NextResponse } from "next/server";
import { triggerVendorSourceSubmission, YoxaTriggerError } from "@/lib/api/yoxa-trigger";

interface SubmissionBody {
  vendorId?: string;
  companyName?: string;
  website?: string;
  industry?: string;
  description?: string;
  directText?: string;
}

// Server-side trigger for vendor_source_submission (PRD Section 5.1). Kept
// server-only because YOXA_DEPLOYMENT_SECRET must not reach the browser.
// Composes the intake form's fields into the trigger_text the Yoxa
// deployment actually accepts (its only confirmed input channel — file
// upload input 500s on Yoxa's side, so isn't sent here; see yoxa-trigger.ts).
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
  if (body.directText) lines.push(`\nDirect capability input:\n${body.directText}`);

  const triggerText = lines.join("\n").trim();
  if (!triggerText) {
    return NextResponse.json({ error: "Provide at least a website, direct text, or company details." }, { status: 400 });
  }

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
