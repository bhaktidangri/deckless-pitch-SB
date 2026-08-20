"use client";

// Single reactive read of the buyer's client-side session identity
// (buyerId, companyName, selected vendor, solution model id), replacing the
// pattern of every page calling getStoredBuyerId()/getStoredCompanyName()
// etc. directly in its render body. That pattern is fine for a page
// component that remounts on every navigation, but src/app/buyer/layout.tsx
// never unmounts while the buyer clicks around the portal — so it used to
// freeze on whatever buyerId/companyName existed at first paint (often
// null, before discover/page.tsx's polling flow resolves one) until an
// unrelated re-render happened to touch it. That looked exactly like a
// caching bug, even though every actual Supabase fetch already disabled
// caching (see buyer-lookup.ts's cache: "no-store").
//
// Subscribes to both the cross-tab `storage` event and the same-tab
// SESSION_EVENT that every setter in buyer-session.ts now dispatches (the
// browser's own `storage` event only fires in *other* tabs, never the one
// that made the change).
import { useEffect, useState } from "react";
import {
  getStoredBuyerId,
  getStoredCompanyName,
  getStoredSelectedVendorId,
  getStoredSelectedVendorName,
  getStoredSolutionModelId,
  subscribeToBuyerSession,
} from "@/lib/buyer-session";

export interface BuyerSession {
  buyerId: string | null;
  companyName: string | null;
  vendorId: string | null;
  vendorName: string | null;
  solutionModelId: string | null;
}

function readSession(): BuyerSession {
  return {
    buyerId: getStoredBuyerId(),
    companyName: getStoredCompanyName(),
    vendorId: getStoredSelectedVendorId(),
    vendorName: getStoredSelectedVendorName(),
    solutionModelId: getStoredSolutionModelId(),
  };
}

export function useBuyerSession(): BuyerSession {
  const [session, setSession] = useState<BuyerSession>(() =>
    typeof window === "undefined"
      ? { buyerId: null, companyName: null, vendorId: null, vendorName: null, solutionModelId: null }
      : readSession()
  );

  useEffect(() => {
    setSession(readSession());
    return subscribeToBuyerSession(() => setSession(readSession()));
  }, []);

  return session;
}
