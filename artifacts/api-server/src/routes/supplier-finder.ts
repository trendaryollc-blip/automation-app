import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, suppliersTable, supplierFinderTable } from "@workspace/db";
import { DeleteSupplierFinderResultParams } from "@workspace/api-zod";

const router: IRouter = Router();

type SupplierMatchData = {
  supplierId: number | null;
  name: string;
  country: string;
  estimatedCostPrice: number;
  shippingDays: number;
  rating: number;
  matchScore: number;
  matchReason: string;
  pros: string[];
  isExisting: boolean;
  website: string | null;
  contactEmail: string | null;
};

const SUGGESTED_SUPPLIERS: Record<
  string,
  { name: string; country: string; website: string; email: string }[]
> = {
  tech: [
    {
      name: "ShenZhen TechLink Co.",
      country: "China",
      website: "https://techlink.cn",
      email: "sourcing@techlink.cn",
    },
    {
      name: "HK Elite Electronics",
      country: "Hong Kong",
      website: "https://hkelite.com",
      email: "b2b@hkelite.com",
    },
    {
      name: "Taiwan Components Direct",
      country: "Taiwan",
      website: "https://twcomponents.com",
      email: "sales@twcomponents.com",
    },
  ],
  health: [
    {
      name: "WellSource Global",
      country: "China",
      website: "https://wellsource.cn",
      email: "bulk@wellsource.cn",
    },
    {
      name: "FitGoods EU",
      country: "Germany",
      website: "https://fitgoods.eu",
      email: "orders@fitgoods.eu",
    },
    {
      name: "ActiveLife Wholesale",
      country: "United States",
      website: "https://activelife.us",
      email: "wholesale@activelife.us",
    },
  ],
  home: [
    {
      name: "HomeStyle Imports",
      country: "China",
      website: "https://homestyleimports.com",
      email: "trade@homestyleimports.com",
    },
    {
      name: "EuroDecor BV",
      country: "Netherlands",
      website: "https://eurodecor.nl",
      email: "info@eurodecor.nl",
    },
    {
      name: "CasaVida Wholesale",
      country: "Spain",
      website: "https://casavida.es",
      email: "pedidos@casavida.es",
    },
  ],
  kitchen: [
    {
      name: "KitchenPro Exports",
      country: "China",
      website: "https://kitchenpro.cn",
      email: "export@kitchenpro.cn",
    },
    {
      name: "Nordic Kitchen Supply",
      country: "Denmark",
      website: "https://nordickitchen.dk",
      email: "bulk@nordickitchen.dk",
    },
    {
      name: "FreshGoods USA",
      country: "United States",
      website: "https://freshgoods.us",
      email: "wholesale@freshgoods.us",
    },
  ],
  default: [
    {
      name: "GlobalSource Direct",
      country: "China",
      website: "https://globalsource.cn",
      email: "inquiry@globalsource.cn",
    },
    {
      name: "EuroDrop Logistics",
      country: "Poland",
      website: "https://eurodrop.pl",
      email: "drop@eurodrop.pl",
    },
    {
      name: "AmeriSource Wholesale",
      country: "United States",
      website: "https://amerisource.us",
      email: "b2b@amerisource.us",
    },
  ],
};

const SOURCING_TIPS: Record<string, string[]> = {
  tech: [
    "Order a sample unit before committing to bulk — check build quality and packaging.",
    "Negotiate a custom branded box at orders of 100+ units to increase perceived value.",
    "Verify CE / FCC certifications if selling in EU or US markets.",
    "Ask for a 30-day quality guarantee window in your supplier agreement.",
  ],
  health: [
    "Request an ingredient or material safety sheet before listing.",
    "Look for suppliers with ISO 9001 certification for consistent quality.",
    "Confirm the product can ship to your target country — some wellness items have import restrictions.",
    "Test 3–5 samples across different colour/size variants before deciding.",
  ],
  home: [
    "Check for fragile item packaging — request double-box protection for glassware.",
    "Bundle complementary items (e.g. candle + holder) to increase average order value.",
    "Verify dimensions exactly — product page photos can be misleading.",
    "Ask about seasonal stock availability — home decor has demand spikes.",
  ],
  kitchen: [
    "Confirm food-safe materials (BPA-free, FDA-compliant) and request documentation.",
    "Check minimum order quantity — many kitchen suppliers require 50+ units.",
    "Look for suppliers who offer dropship-friendly packaging (no invoice inside).",
    "Negotiate a lower price per unit once you pass 100 total orders.",
  ],
  default: [
    "Always order samples from your top two picks before committing.",
    "Compare total landed cost (product + shipping + duties) not just unit price.",
    "Ask about lead time during peak seasons (Nov–Jan) — it can double.",
    "Request a dedicated account manager for faster reorder processing.",
  ],
};

function detectCategory(name: string): string {
  const n = name.toLowerCase();
  if (
    /phone|laptop|charge|cable|usb|gadget|electronic|wifi|watch|earbud|speaker|tech/.test(
      n,
    )
  )
    return "tech";
  if (
    /health|fitness|gym|yoga|posture|muscle|vitamin|workout|exercise|belt|corrector/.test(
      n,
    )
  )
    return "health";
  if (
    /home|decor|light|candle|plant|organiz|storage|bedroom|living|desk|lamp/.test(
      n,
    )
  )
    return "home";
  if (/cook|food|blender|coffee|cup|mug|bottle|tumbler|meal|kitchen/.test(n))
    return "kitchen";
  return "default";
}

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return (h >>> 0) / 0xffffffff;
  };
}

router.post("/suppliers/find", async (req, res): Promise<void> => {
  const { productName, targetCostPrice, preferredCountry } = req.body as {
    productName?: string;
    targetCostPrice?: number;
    preferredCountry?: string;
  };

  if (!productName || typeof productName !== "string") {
    res.status(400).json({ error: "productName is required" });
    return;
  }

  const category = detectCategory(productName);
  const rand = seededRandom(productName.trim().toLowerCase());
  const existingSuppliers = await db
    .select()
    .from(suppliersTable)
    .orderBy(desc(suppliersTable.rating));

  const prosBanks: Record<string, string[]> = {
    high: [
      "Proven track record with existing orders",
      "Already verified quality and packaging",
      "Faster reorder turnaround — relationship established",
      "No onboarding delay — ready to ship immediately",
    ],
    new: [
      "Competitive pricing reported by other dropshippers",
      "Strong reviews on B2B platforms",
      "Specialises in this product category",
      "Flexible MOQ suitable for testing at low volume",
    ],
  };

  const matches: SupplierMatchData[] = [];

  // Score existing suppliers
  for (const s of existingSuppliers) {
    const baseScore = Math.round((Number(s.rating ?? 3) / 5) * 60);
    const countryBonus =
      preferredCountry && s.country === preferredCountry ? 15 : 0;
    const shippingBonus =
      s.shippingDays != null && s.shippingDays <= 7
        ? 10
        : s.shippingDays != null && s.shippingDays <= 14
          ? 5
          : 0;
    const jitter = Math.round(rand() * 10);
    const matchScore = Math.min(
      99,
      baseScore + countryBonus + shippingBonus + jitter,
    );

    const baseCost = targetCostPrice
      ? targetCostPrice * (0.85 + rand() * 0.3)
      : 5 + rand() * 20;

    matches.push({
      supplierId: s.id,
      name: s.name,
      country: s.country ?? "Unknown",
      estimatedCostPrice: Math.round(baseCost * 100) / 100,
      shippingDays: s.shippingDays ?? Math.round(7 + rand() * 14),
      rating: Number(s.rating ?? 4),
      matchScore,
      matchReason: `Existing supplier with ${s.rating ?? "4.0"}★ rating. ${countryBonus ? "Ships from your preferred country. " : ""}${shippingBonus ? "Fast shipping window." : ""}`,
      pros: prosBanks.high.slice(0, 2 + Math.floor(rand() * 2)),
      isExisting: true,
      website: s.website ?? null,
      contactEmail: s.contactEmail ?? null,
    });
  }

  // Add 2 suggested new suppliers from the category pool
  const pool = SUGGESTED_SUPPLIERS[category] ?? SUGGESTED_SUPPLIERS.default;
  const shuffled = [...pool].sort(() => rand() - 0.5).slice(0, 2);
  for (const suggested of shuffled) {
    if (
      preferredCountry &&
      suggested.country !== preferredCountry &&
      rand() > 0.3
    )
      continue;
    const baseCost = targetCostPrice
      ? targetCostPrice * (0.7 + rand() * 0.25)
      : 4 + rand() * 15;
    const matchScore = Math.round(50 + rand() * 35);

    matches.push({
      supplierId: null,
      name: suggested.name,
      country: suggested.country,
      estimatedCostPrice: Math.round(baseCost * 100) / 100,
      shippingDays: Math.round(7 + rand() * 18),
      rating: Math.round((3.5 + rand() * 1.4) * 10) / 10,
      matchScore,
      matchReason: `Recommended ${category} category supplier — not yet in your directory. Consider requesting a sample.`,
      pros: prosBanks.new.slice(0, 2 + Math.floor(rand() * 2)),
      isExisting: false,
      website: suggested.website,
      contactEmail: suggested.email,
    });
  }

  // Sort by match score descending
  matches.sort((a, b) => b.matchScore - a.matchScore);

  const topPick = matches[0]?.name ?? "No match found";
  const tips = (SOURCING_TIPS[category] ?? SOURCING_TIPS.default).slice(
    0,
    3 + Math.floor(rand() * 1),
  );

  const [record] = await db
    .insert(supplierFinderTable)
    .values({
      productName: productName.trim(),
      targetCostPrice:
        targetCostPrice != null ? String(targetCostPrice) : undefined,
      preferredCountry: preferredCountry ?? undefined,
      topPick,
      matches,
      sourcingTips: tips,
    })
    .returning();

  res.json({
    ...record,
    targetCostPrice:
      record.targetCostPrice != null ? Number(record.targetCostPrice) : null,
    matches: record.matches as SupplierMatchData[],
    sourcingTips: record.sourcingTips as string[],
    createdAt: record.createdAt.toISOString(),
  });
});

router.get("/suppliers/find/history", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(supplierFinderTable)
    .orderBy(desc(supplierFinderTable.createdAt))
    .limit(50);
  res.json(
    rows.map((r) => ({
      ...r,
      targetCostPrice:
        r.targetCostPrice != null ? Number(r.targetCostPrice) : null,
      matches: r.matches as SupplierMatchData[],
      sourcingTips: r.sourcingTips as string[],
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.delete(
  "/suppliers/find/history/:id",
  async (req, res): Promise<void> => {
    const params = DeleteSupplierFinderResultParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [row] = await db
      .delete(supplierFinderTable)
      .where(eq(supplierFinderTable.id, params.data.id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Record not found" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
