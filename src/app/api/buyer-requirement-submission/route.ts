import { NextResponse } from "next/server";
import { triggerBuyerRequirementSubmission, YoxaBuyerTriggerError } from "@/lib/api/yoxa-buyer-trigger";

interface SubmissionBody {
  buyerId?: string;
  companyName?: string;
  industry?: string;
  companySize?: number;
  contactName?: string;
  contactRole?: string;
  problemStatement?: string;
  currentTechnology?: string;
  currentCostAnnual?: string;
  users?: string;
  timelineMonths?: string;
  compliance?: string;
}

// Server-side trigger for buyer_requirement_submission (PRD §4). Kept
// server-only because YOXA_BUYER_DEPLOYMENT_SECRET must not reach the
// browser. Composes /buyer/discover's form fields into the trigger_text the
// deployment accepts — mirrors src/app/api/vendor-source-submission/route.ts.
//
// Step 1's own instructions say the optional business-context fields (current
// systems, cost, users, timeline, compliance) arrive on this same payload and
// get parsed straight into Requirements/ClientRealityProfile fields without a
// re-confirmation step — so every optional field the buyer filled in on the
// form is included here, not held back for a later turn.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as SubmissionBody;

  if (!body.problemStatement?.trim()) {
    return NextResponse.json({ error: "A problem statement is required to start discovery." }, { status: 400 });
  }

  const lines: string[] = [];
  if (body.buyerId) {
    lines.push(
      `Returning buyer — buyer.id ${body.buyerId} already exists from an earlier submission. Reuse this buyer record instead of registering a new one.`
    );
  }
  if (body.companyName) lines.push(`Company name: ${body.companyName}`);
  if (!body.buyerId) {
    if (body.industry) lines.push(`Industry: ${body.industry}`);
    if (body.companySize) lines.push(`Company size: ${body.companySize}`);
    if (body.contactName) lines.push(`Contact name: ${body.contactName}`);
    if (body.contactRole) lines.push(`Contact role: ${body.contactRole}`);
  }
  lines.push(`Problem statement: ${body.problemStatement.trim()}`);
  if (body.currentTechnology) lines.push(`Current systems / technology: ${body.currentTechnology}`);
  if (body.currentCostAnnual) lines.push(`Current annual cost: ${body.currentCostAnnual}`);
  if (body.users) lines.push(`Users / load supported today: ${body.users}`);
  if (body.timelineMonths) lines.push(`Target timeline (months): ${body.timelineMonths}`);
  if (body.compliance) lines.push(`Compliance / regulatory requirements: ${body.compliance}`);

  const triggerText = lines.join("\n").trim();

  try {
    const result = await triggerBuyerRequirementSubmission(triggerText);
    return NextResponse.json(result, { status: 202 });
  } catch (e) {
    if (e instanceof YoxaBuyerTriggerError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status === 503 ? 503 : 502 });
    }
    return NextResponse.json({ error: "Could not submit to the buyer workflow trigger." }, { status: 502 });
  }
}
