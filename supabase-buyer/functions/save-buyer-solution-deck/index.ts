// Persists one buyer-facing .pptx deck delivery from Step 6's "Generate
// Solution Pitch Deck" Output Tool (and, per PRD §7.4, potentially a
// regenerated deck after a What-If Scenarios change — same table, newest
// row wins). Called by src/app/api/webhooks/yoxa-buyer-deck/route.ts.
// verify_jwt: false, mirrors save-vendor-knowledge-document.
//
// Accepts either a fileUrl (fetched and re-uploaded) or fileBase64
// (decoded), same defensive both-paths pattern as save-vendor-knowledge-
// document, since Yoxa's real delivery shape for this Output Tool has not
// been directly observed — this only matters once whatever calls this
// function actually reaches it (a raw Output Tool artifact currently stays
// inside Yoxa's own dashboard; nothing pushes it here yet — see the
// yoxa-buyer-deck route's own comment and supabase-buyer/README.md).
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server storage is not configured." }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "The request body was not valid JSON." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const buyerId = body.buyerId as string | undefined;
  if (!buyerId) {
    return new Response(JSON.stringify({ error: "buyerId is required." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const fileUrl = body.fileUrl as string | undefined;
  const fileBase64 = body.fileBase64 as string | undefined;
  const fileName = body.fileName as string | undefined;

  let pptxUrl: string | null = null;

  try {
    let bytes: Uint8Array | null = null;

    if (fileBase64 && typeof fileBase64 === "string") {
      const binary = atob(fileBase64.includes(",") ? fileBase64.split(",").pop()! : fileBase64);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } else if (fileUrl && typeof fileUrl === "string") {
      const fileRes = await fetch(fileUrl);
      if (fileRes.ok) bytes = new Uint8Array(await fileRes.arrayBuffer());
    }

    if (bytes) {
      const safeName = (typeof fileName === "string" && fileName.trim()) || "solution-pitch-deck.pptx";
      const path = `${buyerId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("buyer-solution-pptx")
        .upload(path, bytes, {
          contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          upsert: true,
        });
      if (!uploadError) {
        pptxUrl = supabase.storage.from("buyer-solution-pptx").getPublicUrl(path).data.publicUrl;
      }
    } else if (fileUrl) {
      // Fetch failed or was skipped for some reason but a URL was still
      // supplied — fall back to linking it directly rather than losing it.
      pptxUrl = fileUrl;
    }
  } catch {
    // Fall through — still record the row (with rawPayload) even if the
    // file itself couldn't be fetched/decoded/uploaded, so this is
    // diagnosable from the stored raw_payload instead of silently vanishing.
  }

  const { data, error } = await supabase
    .from("buyer_solution_decks")
    .insert({
      buyer_id: buyerId,
      vendor_id: (body.vendorId as string | undefined) ?? null,
      solution_model_id: (body.solutionModelId as string | undefined) ?? null,
      workflow_run_id: (body.workflowRunId as string | undefined) ?? null,
      title: (body.title as string | undefined) ?? "Solution Pitch Deck",
      pptx_url: pptxUrl,
      status: pptxUrl ? "ready" : "failed",
      raw_payload: body.rawPayload ?? body,
    })
    .select("id, buyer_id, pptx_url, status")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ id: data.id, buyerId: data.buyer_id, pptxUrl: data.pptx_url, status: data.status }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
