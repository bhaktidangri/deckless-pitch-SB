// Assembles everything the fallback pitch deck needs straight from Supabase
// — the same tables the /buyer/solution live workspace reads — so the
// generated .pptx and the live screen can never show different numbers.
// Server-only (route handler use); reuses the existing read-only lookup
// helpers instead of duplicating REST query logic.

import {
  getActiveVendorSelection,
  getBuyer,
  getClientRealityProfile,
  getBuyerRequirements,
  getFitAndGapAssessment,
  getRoiProjection,
  getSolutionModel,
  type BuyerRow,
  type ClientRealityProfileRow,
  type BuyerRequirementRow,
  type GapItemRow,
  type RoiProjectionRow,
  type SolutionMatchRow,
  type SolutionModelRow,
} from "@/lib/api/buyer-lookup";
import { getVendorById, type VendorDetailRow } from "@/lib/api/vendor-lookup";
import { queryApprovedVendorSolutionDna, type ApprovedCapability } from "@/lib/api/buyer-vendor-dna";

export interface PitchDeckData {
  buyer: BuyerRow;
  vendor: VendorDetailRow;
  requirements: BuyerRequirementRow[];
  realityProfile: ClientRealityProfileRow | null;
  matches: SolutionMatchRow[];
  gaps: GapItemRow[];
  model: SolutionModelRow | null;
  roi: RoiProjectionRow | null;
  capabilities: ApprovedCapability[];
}

export class DeckDataError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "DeckDataError";
    this.status = status;
  }
}

// vendorId is optional on the wire (the frontend usually already knows it
// from buyer-session) but is always resolved for real here, falling back to
// the buyer's current active selection — same source of truth /buyer/solution
// itself uses via useBuyerSession.
export async function collectPitchDeckData(buyerId: string, vendorIdInput?: string | null): Promise<PitchDeckData> {
  const buyer = await getBuyer(buyerId);
  if (!buyer) throw new DeckDataError("No buyer found for buyerId.", 404);

  const vendorId = vendorIdInput ?? (await getActiveVendorSelection(buyerId))?.vendorId ?? null;
  if (!vendorId) {
    throw new DeckDataError("This buyer has no confirmed vendor selection yet — nothing to build a deck from.", 422);
  }

  const vendor = await getVendorById(vendorId);
  if (!vendor) throw new DeckDataError("No vendor found for vendorId.", 404);

  const [requirements, realityProfile, fitGap, model, capabilitiesRes] = await Promise.all([
    getBuyerRequirements(buyerId),
    getClientRealityProfile(buyerId),
    getFitAndGapAssessment(buyerId, vendorId),
    getSolutionModel(buyerId, vendorId),
    queryApprovedVendorSolutionDna(vendorId).catch(() => ({ vendorId, companyName: vendor.companyName, capabilityCount: 0, capabilities: [] })),
  ]);

  const roi = model ? await getRoiProjection(model.id) : null;

  if (fitGap.matches.length === 0 && fitGap.gaps.length === 0 && !model?.executiveSummary) {
    throw new DeckDataError(
      "Not enough solution data yet (no fit/gap assessment or executive summary) — the workspace hasn't produced enough to build a deck from.",
      422
    );
  }

  return {
    buyer,
    vendor,
    requirements,
    realityProfile,
    matches: fitGap.matches,
    gaps: fitGap.gaps,
    model,
    roi,
    capabilities: capabilitiesRes.capabilities,
  };
}
