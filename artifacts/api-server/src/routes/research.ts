import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, researchTable } from "@workspace/db";
import { DeleteResearchReportParams } from "@workspace/api-zod";
import { researchProduct } from "../services/ai.js";

const router: IRouter = Router();

const NICHES: Record<string, string[]> = {
  tech: [
    "Tech Enthusiasts",
    "Gamers",
    "Remote Workers",
    "Students",
    "Early Adopters",
  ],
  health: [
    "Fitness Buffs",
    "Wellness Seekers",
    "Athletes",
    "Yoga Community",
    "Biohackers",
  ],
  home: [
    "Home Decorators",
    "Minimalists",
    "New Homeowners",
    "DIY Fans",
    "Interior Designers",
  ],
  beauty: [
    "Beauty Enthusiasts",
    "Self-Care Advocates",
    "Skincare Devotees",
    "Makeup Artists",
    "Eco Shoppers",
  ],
  outdoor: [
    "Outdoor Adventurers",
    "Campers",
    "Hikers",
    "Sports Fans",
    "Nature Lovers",
  ],
  pet: [
    "Pet Owners",
    "Dog Lovers",
    "Cat People",
    "Animal Advocates",
    "First-time Pet Owners",
  ],
  kitchen: [
    "Home Cooks",
    "Fitness Meal Preppers",
    "Vegans",
    "Foodies",
    "Busy Families",
  ],
  default: [
    "General Consumers",
    "Gift Buyers",
    "Bargain Hunters",
    "Online Shoppers",
    "Trend Followers",
  ],
};
const PROS_BANK = [
  "Strong organic search interest year-round",
  "Impulse-buy price point drives high conversion",
  "Low return rate typical for this category",
  "Highly giftable — ideal for Q4 campaigns",
  "Works well with influencer / UGC marketing",
  "Broad demographic appeal",
  "Lightweight and cheap to ship",
  "Easy to bundle for AOV lift",
  "Trending on TikTok and Instagram Reels",
  "Low supplier minimum order quantity",
];
const CONS_BANK = [
  "Market is saturated — differentiation is key",
  "Requires strong creative to stand out in ads",
  "Price-sensitive buyers comparison-shop heavily",
  "Potential quality variance between suppliers",
  "Seasonal demand peaks may affect inventory",
  "High ad CPMs in this niche",
  "Customer support volume can be elevated",
  "Many established branded competitors",
];

function seededRandom(seed: string): () => number {
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

function detectCategory(query: string): string {
  const q = query.toLowerCase();
  if (
    /phone|laptop|charge|cable|usb|tech|gadget|electronic|wifi|blue|watch|earbud|speaker/.test(
      q,
    )
  )
    return "tech";
  if (
    /health|fitness|gym|yoga|posture|muscle|vitamin|supplement|workout|exercise/.test(
      q,
    )
  )
    return "health";
  if (
    /home|decor|light|candle|plant|organiz|storage|bedroom|living|kitchen|desk/.test(
      q,
    )
  )
    return "home";
  if (/beauty|skin|hair|lip|face|makeup|serum|cream|mask/.test(q))
    return "beauty";
  if (/outdoor|camp|hike|hunt|fish|garden|sport|bike|tent/.test(q))
    return "outdoor";
  if (/pet|dog|cat|animal|paw|leash|treat|toy/.test(q)) return "pet";
  if (/cook|food|blender|coffee|cup|mug|bottle|tumbler|meal/.test(q))
    return "kitchen";
  return "default";
}

function buildFallback(query: string) {
  const rand = seededRandom(query.trim().toLowerCase());
  const category = detectCategory(query);
  const nichePool = NICHES[category];
  const demandScore = Math.round(40 + rand() * 55);
  const competitionRoll = rand();
  const competitionLevel =
    competitionRoll < 0.2
      ? "low"
      : competitionRoll < 0.5
        ? "medium"
        : competitionRoll < 0.8
          ? "high"
          : "very-high";
  const suggestedPrice = 15 + Math.round(rand() * 55);
  const estimatedMargin = Math.round(55 + rand() * 30);
  const topNiches = nichePool
    .slice(0, 4)
    .map((name, i) => ({ name, score: Math.round(60 + rand() * 35) - i * 3 }))
    .sort((a, b) => b.score - a.score);
  const prosPool = [...PROS_BANK].sort(() => rand() - 0.5);
  const consPool = [...CONS_BANK].sort(() => rand() - 0.5);
  const pros = prosPool.slice(0, 3 + Math.floor(rand() * 2));
  const cons = consPool.slice(0, 2 + Math.floor(rand() * 2));
  const verdictRoll =
    demandScore +
    (competitionLevel === "low"
      ? 20
      : competitionLevel === "medium"
        ? 10
        : competitionLevel === "high"
          ? -10
          : -20);
  const verdict =
    verdictRoll >= 80
      ? "strong-buy"
      : verdictRoll >= 60
        ? "buy"
        : verdictRoll >= 45
          ? "hold"
          : "avoid";
  const summary = `"${query}" shows ${competitionLevel} competition with a demand score of ${demandScore}/100. At a suggested price of $${suggestedPrice}, you can expect around ${estimatedMargin}% margin. ${verdict === "strong-buy" || verdict === "buy" ? "Solid potential — move quickly." : verdict === "hold" ? "Test at small scale first." : "Consider a less saturated alternative."}`;
  return {
    demandScore,
    competitionLevel,
    suggestedPrice,
    estimatedMargin,
    topNiches,
    pros,
    cons,
    verdict,
    summary,
    aiPowered: false,
  };
}

router.post("/research/analyze", async (req, res): Promise<void> => {
  const { query } = req.body as { query?: string };
  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query is required" });
    return;
  }

  let reportData: ReturnType<typeof buildFallback>;
  let aiPowered = false;

  try {
    const raw = await researchProduct(query);
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    reportData = { ...json, aiPowered: true };
    aiPowered = true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    reportData = buildFallback(query);
    if (msg !== "No AI API keys configured")
      (reportData as Record<string, unknown>).aiError = msg;
  }

  const [report] = await db
    .insert(researchTable)
    .values({
      query: query.trim(),
      demandScore: reportData.demandScore,
      competitionLevel: reportData.competitionLevel,
      suggestedPrice: reportData.suggestedPrice,
      estimatedMargin: reportData.estimatedMargin,
      topNiches: reportData.topNiches,
      pros: reportData.pros,
      cons: reportData.cons,
      verdict: reportData.verdict,
      summary: reportData.summary,
    })
    .returning();

  res.json({
    ...report,
    topNiches: report.topNiches as { name: string; score: number }[],
    pros: report.pros as string[],
    cons: report.cons as string[],
    createdAt: report.createdAt.toISOString(),
    aiPowered,
  });
});

router.get("/research/history", async (_req, res): Promise<void> => {
  const reports = await db
    .select()
    .from(researchTable)
    .orderBy(desc(researchTable.createdAt))
    .limit(50);
  res.json(
    reports.map((r) => ({
      ...r,
      topNiches: r.topNiches as { name: string; score: number }[],
      pros: r.pros as string[],
      cons: r.cons as string[],
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.delete("/research/history/:id", async (req, res): Promise<void> => {
  const params = DeleteResearchReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [report] = await db
    .delete(researchTable)
    .where(eq(researchTable.id, params.data.id))
    .returning();
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
