import { NextResponse } from "next/server";

// Submits the buyer's answer to a paused buyer-workflow human_approval node.
// Mirrors the deleted vendor-side route (git history:
// 0004-Replace-human-approval-gate-with-automated-PPTX-know.patch,
// api/vendor-dna-approvals/[requestId]/respond) generalized to all 6 buyer
// nodes: mark it resolved in our own store (via resolve-buyer-approval-
// request, which hands back the response_url captured on the original
// webhook push), then forward the answer to that URL so the paused run
// actually resumes. If no response_url is on file, this still succeeds for
// our own bookkeeping — yoxaNotified: false tells the caller Yoxa's run
// wasn't reachable.
//
// { selected_option_id } is the only field ever confirmed to resume a
// paused Yoxa run (observed on the vendor side). For the two chat-shaped
// nodes (Query Workspace Evidence, Answer Scenario Questions) the buyer may
// have typed free text instead of clicking a curated option — Yoxa's
// human_approval resume contract has never been confirmed to accept that at
// all (PRD §7.1), so free text is sent best-effort under several plausible
// aliases alongside selected_option_id. Confirm against a real deployment
// once webhooks are registered, and drop whichever aliases turn out unused.
export async function POST(req: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    optionId?: string;
    text?: string;
    numericValue?: Record<string, number>;
  };
  const { optionId, text, numericValue } = body;
  if (!optionId && !text && !numericValue) {
    return NextResponse.json({ error: "optionId, text, or numericValue is required." }, { status: 400 });
  }

  const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!functionsUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const resolveRes = await fetch(`${functionsUrl}/functions/v1/resolve-buyer-approval-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({ requestId, resolvedValue: optionId ?? text ?? numericValue }),
  });
  const resolveData = await resolveRes.json().catch(() => ({}) as Record<string, unknown>);
  if (!resolveRes.ok) {
    return NextResponse.json(resolveData, { status: resolveRes.status });
  }

  const responseUrl = resolveData.responseUrl as string | null | undefined;
  const secret = process.env.YOXA_BUYER_DEPLOYMENT_SECRET;
  if (!responseUrl) {
    return NextResponse.json({ requestId, yoxaNotified: false, reason: "No response_url on file for this request." });
  }

  const resumePayload: Record<string, unknown> = optionId
    ? { selected_option_id: optionId }
    : numericValue
      ? { selected_option_id: JSON.stringify(numericValue), value: numericValue, inputChanges: numericValue }
      : { selected_option_id: text, selectedOptionId: text, text, answer: text, message: text, value: text };

  try {
    const yoxaRes = await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "X-Yoxa-Deployment-Secret": secret } : {}),
      },
      body: JSON.stringify(resumePayload),
    });
    return NextResponse.json({
      requestId,
      yoxaNotified: yoxaRes.ok,
      yoxaStatus: yoxaRes.status,
    });
  } catch {
    return NextResponse.json({ requestId, yoxaNotified: false, reason: "Could not reach Yoxa's response_url." });
  }
}
