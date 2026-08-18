import { NextResponse } from "next/server";

// Submits the vendor's decision on a Yoxa "Request Vendor DNA Approval" HITL
// request. Two steps: mark it answered in our own store (via the
// resolve-vendor-dna-approval-request edge function, which hands back the
// per-request response_url Yoxa supplied on the original webhook push), then
// forward { selected_option_id } to that URL so the paused agent run
// actually resumes. If no response_url was captured (e.g. the webhook
// receiver isn't registered yet), this still succeeds for our own
// bookkeeping — yoxaNotified: false tells the caller Yoxa's run wasn't
// reachable, matching the honest-error pattern used elsewhere in this app.
export async function POST(req: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const body = (await req.json().catch(() => ({}))) as { optionId?: string };
  const optionId = body.optionId;
  if (!optionId) {
    return NextResponse.json({ error: "optionId is required." }, { status: 400 });
  }

  const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!functionsUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const resolveRes = await fetch(`${functionsUrl}/functions/v1/resolve-vendor-dna-approval-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({ requestId, selectedOptionId: optionId }),
  });
  const resolveData = await resolveRes.json().catch(() => ({}) as Record<string, unknown>);
  if (!resolveRes.ok) {
    return NextResponse.json(resolveData, { status: resolveRes.status });
  }

  const responseUrl = resolveData.responseUrl as string | null | undefined;
  const secret = process.env.YOXA_DEPLOYMENT_SECRET;
  if (!responseUrl) {
    return NextResponse.json({ requestId, yoxaNotified: false, reason: "No response_url on file for this request." });
  }

  try {
    const yoxaRes = await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "X-Yoxa-Deployment-Secret": secret } : {}),
      },
      body: JSON.stringify({ selected_option_id: optionId }),
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
