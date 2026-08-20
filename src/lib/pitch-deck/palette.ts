// Deterministic per-vendor accent color — vendors.color is unset on every
// real row observed so far, so this picks a consistent, good-looking accent
// from a curated set instead of falling back to a generic default for every
// deck. Same vendor always gets the same color across regenerations.

export interface DeckPalette {
  name: string;
  accent: string; // primary brand accent — buttons, headers, chart series 1
  accentDark: string; // deep shade of the accent — title slide background
  accentSoft: string; // light tint — card backgrounds, subtle fills
}

const PALETTES: DeckPalette[] = [
  { name: "indigo", accent: "4F46E5", accentDark: "1E1B4B", accentSoft: "EEF0FD" },
  { name: "teal", accent: "0D9488", accentDark: "042F2E", accentSoft: "E6F7F5" },
  { name: "rose", accent: "E11D48", accentDark: "4C0519", accentSoft: "FDECEF" },
  { name: "amber", accent: "D97706", accentDark: "451A03", accentSoft: "FDF3E7" },
  { name: "violet", accent: "7C3AED", accentDark: "2E1065", accentSoft: "F2ECFD" },
  { name: "emerald", accent: "059669", accentDark: "022C22", accentSoft: "E5F6EF" },
  { name: "sky", accent: "0284C7", accentDark: "082F49", accentSoft: "E6F3FB" },
  { name: "fuchsia", accent: "C026D3", accentDark: "4A044E", accentSoft: "FBEAFC" },
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Prefers a real hex color on the vendor row if one is ever actually set;
// otherwise derives a stable pick from the vendor's own id so it never
// changes between deck regenerations.
export function paletteForVendor(vendorId: string, explicitColor?: string | null): DeckPalette {
  if (explicitColor && /^#?[0-9a-fA-F]{6}$/.test(explicitColor)) {
    const accent = explicitColor.replace("#", "").toUpperCase();
    return { name: "custom", accent, accentDark: "111827", accentSoft: "F3F4F6" };
  }
  return PALETTES[hashString(vendorId) % PALETTES.length];
}

// Semantic (not brand) colors — status meaning must stay legible regardless
// of the vendor's own accent, same convention as the live workspace's badges.
export const SEMANTIC = {
  positive: "059669",
  warning: "D97706",
  negative: "E11D48",
  neutral: "0284C7",
  textDark: "111827",
  textMuted: "6B7280",
  border: "E5E7EB",
  cardBg: "FFFFFF",
  pageBg: "F7F8FB",
  white: "FFFFFF",
};
