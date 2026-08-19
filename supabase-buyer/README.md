# Buyer workflow backend objects — not yet deployed

This folder holds the Supabase migration SQL and edge function source for
the buyer-workflow integration described in `buyerworkflowintegrationprd.md`
and the plan that produced it. None of it is deployed yet — the Supabase MCP
connection was unavailable while this was written, so it's staged here for
review and deployment once that's restored (or apply it by hand: paste the
SQL into the Supabase SQL editor, and deploy each `functions/*/index.ts` via
`supabase functions deploy <name>` or the dashboard's Edge Functions editor,
with **Verify JWT off**, same as every other function in this project).

## What's here and why

The 12 buyer-workflow edge functions in `buyerworkflowopenapiconnectors/`
already exist and are called by Yoxa's own agent during a run — nothing new
needed there. What's missing, and what this folder adds, is the
infrastructure the *frontend* needs that has no PRD-documented tool behind
it yet:

1. **The HITL bridge** (`buyer_workflow_approval_requests` table +
   `save-buyer-approval-request` / `resolve-buyer-approval-request`
   functions) — lets the frontend receive a push when the workflow pauses at
   one of its 6 `human_approval` nodes, show the right control, and resume
   the run. Reconstructed from the vendor-side workflow's own now-deleted
   HITL infrastructure (git history:
   `0004-Replace-human-approval-gate-with-automated-PPTX-know.patch`),
   generalized from one fixed use case to all 6 buyer nodes via `node_key`.

2. **The solution-deck delivery** (`buyer_solution_decks` table +
   `save-buyer-solution-deck` function + `buyer-solution-pptx` storage
   bucket) — Step 6's `Generate Solution Pitch Deck` Output Tool has to land
   its `.pptx` file somewhere queryable; nothing in the PRD's own Supabase
   schema reference names a table for it, so this mirrors the vendor side's
   `vendor_knowledge_documents` / `vendor-knowledge-pptx` pattern exactly.

3. **The two vendor-side controls PRD §7.7 calls a stated blocker**
   (`resolve-capability-frontier-item`, `confirm-vendor-discussion-meeting`)
   — confirmed genuinely unbuilt anywhere (grepped the vendor-side PRD too).

## After deploying

1. Register these URLs as webhook endpoints on the **buyer** deployment in
   the Yoxa dashboard (there's no discoverable API to do this, same as the
   vendor side):
   - `/api/webhooks/yoxa-buyer-hitl` — for the 6 `human_approval` pauses.
   - `/api/webhooks/yoxa-buyer-deck` — for the Step 6 `.pptx` delivery.
   Both need a publicly reachable URL — a deployed app, or a tunnel (ngrok
   etc.) for local dev.
2. Do one real end-to-end trigger and watch what actually lands in
   `buyer_workflow_approval_requests.raw_payload` / the deck webhook's
   forwarded `rawPayload`. The field-name lookups in
   `src/app/api/webhooks/yoxa-buyer-hitl/route.ts` and
   `src/app/api/webhooks/yoxa-buyer-deck/route.ts` are deliberately
   permissive across plausible variants (same convention as the vendor
   side's `yoxa-pptx` route) precisely because no real payload for this
   deployment has been observed yet — tighten them once one has.
3. Specifically confirm whether the two chat-shaped `human_approval` nodes'
   resume endpoint (`response_url`) actually accepts free text under any of
   the aliases sent in `src/app/api/buyer-approvals/[requestId]/respond/route.ts`,
   or only ever `selected_option_id`. This is the one piece of PRD §7.1's
   defect that genuinely cannot be resolved by reading code — see that
   route's comment.
