// Builds a presentation-ready .pptx entirely from data already sitting in
// Supabase (see collect-deck-data.ts) — the fallback path for when the Yoxa
// agent's own "Generate Solution Pitch Deck" Output Tool never lands (every
// buyer_solution_decks row observed in production so far is status=failed).
// Deliberately shows nothing that isn't backed by a real row: no invented
// ROI numbers, no marketing copy the model didn't actually write. Slides
// with no underlying data are skipped rather than filled with placeholders.
import pptxgen from "pptxgenjs";
import type { PitchDeckData } from "./collect-deck-data";
import { paletteForVendor, SEMANTIC, type DeckPalette } from "./palette";

const FONT = "Calibri";

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function fmtPercent(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${Math.round(n)}%`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const MATCH_LABEL: Record<string, string> = {
  strong_match: "Strong match",
  partial_match: "Partial match",
  unmatched: "Unmatched",
  requires_validation: "Needs validation",
};

const MATCH_COLOR: Record<string, string> = {
  strong_match: SEMANTIC.positive,
  partial_match: SEMANTIC.warning,
  unmatched: SEMANTIC.negative,
  requires_validation: SEMANTIC.neutral,
};

const SEVERITY_COLOR: Record<string, string> = {
  high: SEMANTIC.negative,
  medium: SEMANTIC.warning,
  low: SEMANTIC.positive,
};

const PRIORITY_COLOR: Record<string, string> = {
  high: SEMANTIC.negative,
  medium: SEMANTIC.warning,
  low: SEMANTIC.textMuted,
};

let pageCounter = 0;
let pageTotal = 0;

function addFooter(slide: pptxgen.Slide, palette: DeckPalette, buyerName: string, vendorName: string) {
  pageCounter += 1;
  slide.addText(`${buyerName}  ×  ${vendorName}`, {
    x: 0.5,
    y: 7.12,
    w: 7,
    h: 0.3,
    fontSize: 8.5,
    color: SEMANTIC.textMuted,
    fontFace: FONT,
  });
  slide.addText(`${pageCounter} / ${pageTotal}`, {
    x: 12.3,
    y: 7.12,
    w: 0.6,
    h: 0.3,
    fontSize: 8.5,
    color: SEMANTIC.textMuted,
    fontFace: FONT,
    align: "right",
  });
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: palette.accent }, line: { type: "none" } });
}

function addSectionHeader(slide: pptxgen.Slide, palette: DeckPalette, kicker: string, title: string) {
  slide.addText(kicker.toUpperCase(), {
    x: 0.5,
    y: 0.42,
    w: 10,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: palette.accent,
    fontFace: FONT,
    charSpacing: 1,
  });
  slide.addText(title, {
    x: 0.5,
    y: 0.72,
    w: 12.3,
    h: 0.7,
    fontSize: 26,
    bold: true,
    color: SEMANTIC.textDark,
    fontFace: FONT,
  });
  slide.addShape("rect", { x: 0.52, y: 1.42, w: 0.6, h: 0.06, fill: { color: palette.accent }, line: { type: "none" } });
}

function titleSlide(pptx: pptxgen, data: PitchDeckData, palette: DeckPalette) {
  const slide = pptx.addSlide();
  slide.background = { color: palette.accentDark };

  // Faint decorative geometry — large soft circle, kept subtle so it never
  // competes with the text.
  slide.addShape("ellipse", { x: 9.3, y: -2.3, w: 7, h: 7, fill: { color: palette.accent, transparency: 82 }, line: { type: "none" } });
  slide.addShape("ellipse", { x: -2.5, y: 4.8, w: 5, h: 5, fill: { color: palette.accent, transparency: 88 }, line: { type: "none" } });

  slide.addShape("roundRect", {
    x: 0.55,
    y: 0.55,
    w: 0.62,
    h: 0.62,
    rectRadius: 0.12,
    fill: { color: palette.accent },
    line: { type: "none" },
  });
  slide.addText(initials(data.vendor.companyName), {
    x: 0.55,
    y: 0.55,
    w: 0.62,
    h: 0.62,
    fontSize: 16,
    bold: true,
    color: SEMANTIC.white,
    fontFace: FONT,
    align: "center",
    valign: "middle",
  });

  slide.addText("SOLUTION PITCH DECK", {
    x: 0.55,
    y: 2.55,
    w: 10,
    h: 0.4,
    fontSize: 13,
    bold: true,
    color: palette.accent,
    fontFace: FONT,
    charSpacing: 2,
  });
  slide.addText(data.vendor.companyName, {
    x: 0.5,
    y: 2.95,
    w: 12,
    h: 1.3,
    fontSize: 44,
    bold: true,
    color: SEMANTIC.white,
    fontFace: FONT,
  });
  slide.addText(`Prepared for ${data.buyer.companyName}`, {
    x: 0.55,
    y: 4.05,
    w: 11,
    h: 0.55,
    fontSize: 20,
    color: "C7CCE8",
    fontFace: FONT,
  });

  const meta = [
    data.buyer.industry ?? undefined,
    data.buyer.companySize ? `${data.buyer.companySize.toLocaleString("en-US")} employees` : undefined,
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  ].filter(Boolean);
  slide.addText(meta.join("   •   "), {
    x: 0.55,
    y: 6.55,
    w: 11,
    h: 0.4,
    fontSize: 12,
    color: "8B90B8",
    fontFace: FONT,
  });
}

function executiveSummarySlide(pptx: pptxgen, data: PitchDeckData, palette: DeckPalette) {
  const slide = pptx.addSlide();
  slide.background = { color: SEMANTIC.pageBg };
  addSectionHeader(slide, palette, "Overview", "Executive summary");

  const summary =
    data.model?.executiveSummary ??
    [
      `${data.buyer.companyName} evaluated ${data.vendor.companyName} against ${data.requirements.length} captured requirement${data.requirements.length === 1 ? "" : "s"}.`,
      data.matches.length > 0
        ? `${data.matches.filter((m) => m.matchStatus === "strong_match").length} of ${data.matches.length} requirements are a strong match today.`
        : undefined,
      data.gaps.length > 0 ? `${data.gaps.length} gap${data.gaps.length === 1 ? "" : "s"} against the desired state ${data.gaps.length === 1 ? "was" : "were"} identified.` : undefined,
    ]
      .filter(Boolean)
      .join(" ");

  slide.addShape("roundRect", {
    x: 0.5,
    y: 1.75,
    w: 12.33,
    h: 2.1,
    rectRadius: 0.08,
    fill: { color: SEMANTIC.cardBg },
    line: { color: SEMANTIC.border, width: 1 },
    shadow: { type: "outer", color: "1F2937", opacity: 0.08, blur: 8, offset: 2, angle: 90 },
  });
  slide.addText(summary, {
    x: 0.85,
    y: 1.98,
    w: 11.6,
    h: 1.65,
    fontSize: 15,
    color: SEMANTIC.textDark,
    fontFace: FONT,
    valign: "top",
    lineSpacing: 22,
  });

  // Quick stat row underneath — only the numbers we actually have.
  const stats: { label: string; value: string }[] = [];
  stats.push({ label: "Requirements", value: String(data.requirements.length) });
  if (data.matches.length > 0) stats.push({ label: "Strong matches", value: String(data.matches.filter((m) => m.matchStatus === "strong_match").length) });
  if (data.gaps.length > 0) stats.push({ label: "Gaps identified", value: String(data.gaps.length) });
  if (data.roi?.savingsPercent != null) stats.push({ label: "Projected savings", value: fmtPercent(data.roi.savingsPercent) });

  const cardW = 12.33 / Math.max(stats.length, 1);
  stats.forEach((s, i) => {
    const x = 0.5 + i * cardW;
    slide.addShape("roundRect", {
      x: x + 0.08,
      y: 4.15,
      w: cardW - 0.16,
      h: 1.5,
      rectRadius: 0.08,
      fill: { color: palette.accentSoft },
      line: { type: "none" },
    });
    slide.addText(s.value, {
      x: x + 0.08,
      y: 4.32,
      w: cardW - 0.16,
      h: 0.75,
      fontSize: 30,
      bold: true,
      color: palette.accentDark,
      fontFace: FONT,
      align: "center",
    });
    slide.addText(s.label.toUpperCase(), {
      x: x + 0.08,
      y: 5.08,
      w: cardW - 0.16,
      h: 0.45,
      fontSize: 10,
      bold: true,
      color: SEMANTIC.textMuted,
      fontFace: FONT,
      align: "center",
      charSpacing: 1,
    });
  });

  addFooter(slide, palette, data.buyer.companyName, data.vendor.companyName);
}

function clientRealitySlide(pptx: pptxgen, data: PitchDeckData, palette: DeckPalette) {
  const p = data.realityProfile;
  if (!p) return;
  const slide = pptx.addSlide();
  slide.background = { color: SEMANTIC.pageBg };
  addSectionHeader(slide, palette, "Client reality profile", "Where you are today");

  const factRows: string[][] = [];
  if (p.currentTechnology.length) factRows.push(["Current technology", p.currentTechnology.join(", ")]);
  if (p.currentCostAnnual != null) factRows.push(["Current annual cost", fmtMoney(p.currentCostAnnual)]);
  if (p.users != null) factRows.push(["Users", p.users.toLocaleString("en-US")]);
  if (p.timelineMonths != null) factRows.push(["Target timeline", `${p.timelineMonths} month${p.timelineMonths === 1 ? "" : "s"}`]);
  if (p.processes.length) factRows.push(["Key processes", p.processes.join(", ")]);

  if (factRows.length > 0) {
    slide.addTable(
      factRows.map(([k, v]) => [
        { text: k, options: { bold: true, color: SEMANTIC.textMuted, fontSize: 11 } },
        { text: v, options: { color: SEMANTIC.textDark, fontSize: 12 } },
      ]),
      {
        x: 0.5,
        y: 1.75,
        w: 5.9,
        colW: [2.1, 3.8],
        fontFace: FONT,
        border: { type: "solid", color: SEMANTIC.border, pt: 0.75 },
        autoPage: false,
        valign: "middle",
        margin: [4, 8, 4, 8],
      }
    );
  }

  const listBlock = (title: string, items: string[], x: number, color: string) => {
    if (items.length === 0) return;
    slide.addText(title, { x, y: 1.75, w: 6, h: 0.35, fontSize: 13, bold: true, color: SEMANTIC.textDark, fontFace: FONT });
    slide.addText(
      items.slice(0, 6).map((t) => ({ text: t, options: { bullet: { code: "2022", color }, breakLine: true, color: SEMANTIC.textDark, fontSize: 11.5, paraSpaceAfter: 6 } })),
      { x, y: 2.15, w: 6, h: 4.6, fontFace: FONT, valign: "top" }
    );
  };
  listBlock("Pain points", p.painPoints, 6.75, SEMANTIC.negative);
  listBlock("Goals", p.goals, 6.75, SEMANTIC.positive);

  addFooter(slide, palette, data.buyer.companyName, data.vendor.companyName);
}

function requirementsSlide(pptx: pptxgen, data: PitchDeckData, palette: DeckPalette) {
  if (data.requirements.length === 0) return;
  const slide = pptx.addSlide();
  slide.background = { color: SEMANTIC.pageBg };
  addSectionHeader(slide, palette, "Discovery", "Requirements captured");

  const rows = data.requirements.slice(0, 12).map((r) => [
    { text: r.text, options: { color: SEMANTIC.textDark, fontSize: 11.5, valign: "middle" as const } },
    {
      text: r.priority.toUpperCase(),
      options: { color: PRIORITY_COLOR[r.priority] ?? SEMANTIC.textMuted, bold: true, fontSize: 10, align: "center" as const, valign: "middle" as const },
    },
  ]);
  slide.addTable(
    [
      [
        { text: "Requirement", options: { bold: true, color: SEMANTIC.white, fill: { color: palette.accent }, fontSize: 11 } },
        { text: "Priority", options: { bold: true, color: SEMANTIC.white, fill: { color: palette.accent }, fontSize: 11, align: "center" as const } },
      ],
      ...rows,
    ],
    {
      x: 0.5,
      y: 1.75,
      w: 12.33,
      colW: [10.1, 2.23],
      fontFace: FONT,
      border: { type: "solid", color: SEMANTIC.border, pt: 0.75 },
      autoPage: false,
      margin: [5, 8, 5, 8],
    }
  );

  if (data.requirements.length > 12) {
    slide.addText(`+ ${data.requirements.length - 12} more captured in the workspace`, {
      x: 0.5,
      y: 6.75,
      w: 8,
      h: 0.3,
      fontSize: 10,
      italic: true,
      color: SEMANTIC.textMuted,
      fontFace: FONT,
    });
  }

  addFooter(slide, palette, data.buyer.companyName, data.vendor.companyName);
}

function fitGapSlide(pptx: pptxgen, data: PitchDeckData, palette: DeckPalette) {
  if (data.matches.length === 0) return;
  const slide = pptx.addSlide();
  slide.background = { color: SEMANTIC.pageBg };
  addSectionHeader(slide, palette, "Solution match", `How ${data.vendor.companyName} addresses your requirements`);

  const shown = data.matches.slice(0, 9);
  const rows = shown.map((m) => [
    { text: m.requirementText ?? "—", options: { color: SEMANTIC.textDark, fontSize: 10.5, valign: "middle" as const } },
    { text: m.capabilityName ?? "—", options: { color: SEMANTIC.textDark, fontSize: 10.5, valign: "middle" as const } },
    {
      text: MATCH_LABEL[m.matchStatus] ?? m.matchStatus,
      options: { color: MATCH_COLOR[m.matchStatus] ?? SEMANTIC.textMuted, bold: true, fontSize: 9.5, align: "center" as const, valign: "middle" as const },
    },
    {
      text: m.confidence != null ? `${Math.round(m.confidence * (m.confidence <= 1 ? 100 : 1))}%` : "—",
      options: { color: SEMANTIC.textMuted, fontSize: 10, align: "center" as const, valign: "middle" as const },
    },
  ]);

  slide.addTable(
    [
      [
        { text: "Requirement", options: { bold: true, color: SEMANTIC.white, fill: { color: palette.accent }, fontSize: 10.5 } },
        { text: "Matched capability", options: { bold: true, color: SEMANTIC.white, fill: { color: palette.accent }, fontSize: 10.5 } },
        { text: "Status", options: { bold: true, color: SEMANTIC.white, fill: { color: palette.accent }, fontSize: 10.5, align: "center" as const } },
        { text: "Confidence", options: { bold: true, color: SEMANTIC.white, fill: { color: palette.accent }, fontSize: 10.5, align: "center" as const } },
      ],
      ...rows,
    ],
    {
      x: 0.5,
      y: 1.75,
      w: 12.33,
      colW: [4.6, 4.6, 1.7, 1.43],
      fontFace: FONT,
      border: { type: "solid", color: SEMANTIC.border, pt: 0.75 },
      autoPage: false,
      margin: [4, 6, 4, 6],
    }
  );

  if (data.matches.length > 9) {
    slide.addText(`+ ${data.matches.length - 9} more matches in the full workspace`, {
      x: 0.5,
      y: 6.9,
      w: 8,
      h: 0.3,
      fontSize: 10,
      italic: true,
      color: SEMANTIC.textMuted,
      fontFace: FONT,
    });
  }

  addFooter(slide, palette, data.buyer.companyName, data.vendor.companyName);
}

function gapsSlide(pptx: pptxgen, data: PitchDeckData, palette: DeckPalette) {
  if (data.gaps.length === 0) return;
  const slide = pptx.addSlide();
  slide.background = { color: SEMANTIC.pageBg };
  addSectionHeader(slide, palette, "Honest assessment", "Gaps against your desired state");

  const shown = data.gaps.slice(0, 4);
  const cardH = 4.6 / shown.length;
  shown.forEach((g, i) => {
    const y = 1.8 + i * cardH;
    slide.addShape("roundRect", {
      x: 0.5,
      y,
      w: 12.33,
      h: cardH - 0.14,
      rectRadius: 0.06,
      fill: { color: SEMANTIC.cardBg },
      line: { color: SEMANTIC.border, width: 1 },
    });
    slide.addShape("rect", {
      x: 0.5,
      y,
      w: 0.08,
      h: cardH - 0.14,
      fill: { color: SEVERITY_COLOR[g.severity] ?? SEMANTIC.textMuted },
      line: { type: "none" },
    });
    slide.addText((g.severity ?? "medium").toUpperCase(), {
      x: 0.7,
      y: y + 0.08,
      w: 2,
      h: 0.3,
      fontSize: 9,
      bold: true,
      color: SEVERITY_COLOR[g.severity] ?? SEMANTIC.textMuted,
      fontFace: FONT,
      charSpacing: 1,
    });
    slide.addText(
      [
        { text: "Gap: ", options: { bold: true, color: SEMANTIC.textDark } },
        { text: g.gap ?? "Not yet specified", options: { color: SEMANTIC.textDark } },
      ],
      { x: 0.7, y: y + 0.36, w: 11.9, h: cardH - 0.55, fontSize: 11, fontFace: FONT, valign: "top", lineSpacing: 15 }
    );
  });

  if (data.gaps.length > 4) {
    slide.addText(`+ ${data.gaps.length - 4} more gaps tracked in the workspace`, {
      x: 0.5,
      y: 6.9,
      w: 8,
      h: 0.3,
      fontSize: 10,
      italic: true,
      color: SEMANTIC.textMuted,
      fontFace: FONT,
    });
  }

  addFooter(slide, palette, data.buyer.companyName, data.vendor.companyName);
}

function roiSlide(pptx: pptxgen, data: PitchDeckData, palette: DeckPalette) {
  const roi = data.roi;
  if (!roi || roi.currentAnnualCost == null || roi.projectedAnnualCost == null) return;
  const slide = pptx.addSlide();
  slide.background = { color: SEMANTIC.pageBg };
  addSectionHeader(slide, palette, "Business case", "Projected return on investment");

  slide.addChart(
    pptx.ChartType.bar,
    [{ name: "Annual cost", labels: ["Current", "Projected"], values: [roi.currentAnnualCost, roi.projectedAnnualCost] }],
    {
      x: 0.5,
      y: 1.8,
      w: 6.6,
      h: 4.6,
      barDir: "col",
      chartColors: [palette.accent],
      showValue: true,
      dataLabelColor: SEMANTIC.textDark,
      dataLabelFormatCode: "$#,##0",
      valAxisLabelFormatCode: "$#,##0",
      showLegend: false,
      catAxisLabelColor: SEMANTIC.textMuted,
      valAxisLabelColor: SEMANTIC.textMuted,
      catAxisLineColor: SEMANTIC.border,
      valAxisLineColor: SEMANTIC.border,
      valGridLine: { color: SEMANTIC.border, style: "solid", size: 0.75 },
      catGridLine: { style: "none" },
      barGapWidthPct: 60,
    }
  );

  const stats: { label: string; value: string }[] = [
    { label: "Current annual cost", value: fmtMoney(roi.currentAnnualCost) },
    { label: "Projected annual cost", value: fmtMoney(roi.projectedAnnualCost) },
  ];
  if (roi.savingsPercent != null) stats.push({ label: "Savings", value: fmtPercent(roi.savingsPercent) });
  if (roi.paybackMonths != null) stats.push({ label: "Payback period", value: `${roi.paybackMonths} mo` });
  if (roi.threeYearSavings != null) stats.push({ label: "3-year savings", value: fmtMoney(roi.threeYearSavings) });

  const startX = 7.4;
  const cardH = 4.6 / stats.length;
  stats.forEach((s, i) => {
    const y = 1.8 + i * cardH;
    slide.addShape("roundRect", {
      x: startX,
      y: y + 0.05,
      w: 5.43,
      h: cardH - 0.15,
      rectRadius: 0.06,
      fill: { color: palette.accentSoft },
      line: { type: "none" },
    });
    slide.addText(s.value, {
      x: startX + 0.25,
      y: y + 0.05,
      w: 3,
      h: cardH - 0.15,
      fontSize: 20,
      bold: true,
      color: palette.accentDark,
      fontFace: FONT,
      valign: "middle",
    });
    slide.addText(s.label.toUpperCase(), {
      x: startX + 3.1,
      y: y + 0.05,
      w: 2.2,
      h: cardH - 0.15,
      fontSize: 9,
      bold: true,
      color: SEMANTIC.textMuted,
      fontFace: FONT,
      valign: "middle",
      charSpacing: 0.5,
    });
  });

  addFooter(slide, palette, data.buyer.companyName, data.vendor.companyName);
}

function capabilitiesSlide(pptx: pptxgen, data: PitchDeckData, palette: DeckPalette) {
  if (data.capabilities.length === 0) return;
  const slide = pptx.addSlide();
  slide.background = { color: SEMANTIC.pageBg };
  addSectionHeader(slide, palette, `${data.vendor.companyName}'s knowledge base`, "Grounded in verified capabilities");

  const shown = data.capabilities.slice(0, 6);
  const cols = 2;
  const cardW = 6.0;
  const cardH = 1.55;
  shown.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * (cardW + 0.33);
    const y = 1.8 + row * (cardH + 0.2);
    slide.addShape("roundRect", {
      x,
      y,
      w: cardW,
      h: cardH,
      rectRadius: 0.06,
      fill: { color: SEMANTIC.cardBg },
      line: { color: SEMANTIC.border, width: 1 },
    });
    slide.addText(c.name, { x: x + 0.22, y: y + 0.12, w: cardW - 0.44, h: 0.35, fontSize: 12.5, bold: true, color: SEMANTIC.textDark, fontFace: FONT });
    if (c.description) {
      slide.addText(c.description, {
        x: x + 0.22,
        y: y + 0.5,
        w: cardW - 0.44,
        h: 0.75,
        fontSize: 9.5,
        color: SEMANTIC.textMuted,
        fontFace: FONT,
        valign: "top",
        lineSpacing: 12,
      });
    }
    if (c.verificationStatus === "verified") {
      slide.addText("VERIFIED", {
        x: x + cardW - 1.35,
        y: y + 0.12,
        w: 1.1,
        h: 0.3,
        fontSize: 8,
        bold: true,
        color: SEMANTIC.positive,
        fontFace: FONT,
        align: "right",
      });
    }
  });

  if (data.capabilities.length > 6) {
    slide.addText(`+ ${data.capabilities.length - 6} more capabilities in ${data.vendor.companyName}'s published Solution DNA`, {
      x: 0.5,
      y: 6.9,
      w: 10,
      h: 0.3,
      fontSize: 10,
      italic: true,
      color: SEMANTIC.textMuted,
      fontFace: FONT,
    });
  }

  addFooter(slide, palette, data.buyer.companyName, data.vendor.companyName);
}

function nextStepsSlide(pptx: pptxgen, data: PitchDeckData, palette: DeckPalette) {
  const slide = pptx.addSlide();
  slide.background = { color: palette.accentDark };

  slide.addShape("ellipse", { x: -2, y: -2.5, w: 6, h: 6, fill: { color: palette.accent, transparency: 85 }, line: { type: "none" } });

  slide.addText("NEXT STEPS", {
    x: 0.55,
    y: 0.9,
    w: 8,
    h: 0.4,
    fontSize: 13,
    bold: true,
    color: palette.accent,
    fontFace: FONT,
    charSpacing: 2,
  });
  slide.addText("Let's move this forward", {
    x: 0.5,
    y: 1.3,
    w: 11,
    h: 0.9,
    fontSize: 32,
    bold: true,
    color: SEMANTIC.white,
    fontFace: FONT,
  });

  const steps = [
    "Review this solution against your requirements and priorities.",
    "Run what-if scenarios to stress-test the ROI assumptions.",
    `Request time with a ${data.vendor.companyName} expert for anything still unresolved.`,
  ];
  slide.addText(
    steps.map((t, i) => ({ text: `${i + 1}.  ${t}`, options: { breakLine: true, color: "E4E6F5", fontSize: 15, paraSpaceAfter: 14 } })),
    { x: 0.55, y: 2.55, w: 10.5, h: 2.7, fontFace: FONT, valign: "top" }
  );

  if (data.vendor.email || data.vendor.website) {
    slide.addText([data.vendor.email, data.vendor.website].filter(Boolean).join("   •   "), {
      x: 0.55,
      y: 6.5,
      w: 11,
      h: 0.4,
      fontSize: 12,
      color: "8B90B8",
      fontFace: FONT,
    });
  }

  addFooter(slide, palette, data.buyer.companyName, data.vendor.companyName);
}

export async function buildBuyerPitchDeck(data: PitchDeckData): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = data.vendor.companyName;
  pptx.company = data.vendor.companyName;
  pptx.title = `${data.vendor.companyName} — Solution Pitch Deck for ${data.buyer.companyName}`;

  const palette = paletteForVendor(data.vendor.id, null);

  pageCounter = 0;
  pageTotal =
    1 + // title
    1 + // executive summary
    (data.realityProfile ? 1 : 0) +
    (data.requirements.length > 0 ? 1 : 0) +
    (data.matches.length > 0 ? 1 : 0) +
    (data.gaps.length > 0 ? 1 : 0) +
    (data.roi?.currentAnnualCost != null && data.roi?.projectedAnnualCost != null ? 1 : 0) +
    (data.capabilities.length > 0 ? 1 : 0) +
    1; // next steps (footer only counts content slides — title has no footer, so subtract it back below)
  pageTotal -= 1; // title slide has no footer/page number

  titleSlide(pptx, data, palette);
  executiveSummarySlide(pptx, data, palette);
  clientRealitySlide(pptx, data, palette);
  requirementsSlide(pptx, data, palette);
  fitGapSlide(pptx, data, palette);
  gapsSlide(pptx, data, palette);
  roiSlide(pptx, data, palette);
  capabilitiesSlide(pptx, data, palette);
  nextStepsSlide(pptx, data, palette);

  const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return buf;
}
