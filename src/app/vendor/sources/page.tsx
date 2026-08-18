import { redirect } from "next/navigation";

// Source material is now part of the single vendor_source_submission
// intake form (PRD Section 5.1 / 8) — merged into /vendor/onboarding.
export default function VendorSourcesRedirect() {
  redirect("/vendor/onboarding");
}
