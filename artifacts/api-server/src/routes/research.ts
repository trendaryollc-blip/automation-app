import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, desc, and } from "drizzle-orm";
import { db, researchTable } from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";
import { researchProduct } from "../services/ai.js";

const router: IRouter = Router();

const AnalyzeBodySchema = z.object({
  query: z.string().min(1).max(200),
});

const IdParamSchema = z.object({ id: z.coerce.number().int().positive() });

type CompetitionLevel = "low" | "medium" | "high" | "very-high";
type Verdict = "strong-buy" | "buy" | "hold" | "avoid";

interface ReportData {
  demandScore: number;
  competitionLevel: CompetitionLevel;
  suggestedPrice: number;
  estimatedMargin: number;
  topNiches: { name: string; score: number }[];
  pros: string[];
  cons: string[];
  verdict: Verdict;
  summary: string;
  aiPowered: boolean;
}

router.post("/research/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { query } = parsed.data;

  let reportData: ReportData;
  let aiPowered = false;

  try {
    const raw = await researchProduct(query);
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    reportData = { ...json, aiPowered: true };
    aiPowered = true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    reportData = buildFallback(query);
    if (msg !== "No AI API keys configured") {
      (reportData as unknown as Record<string, unknown>).aiError = msg;
    }
  }

  const [report] = await db
    .insert(researchTable)
    .values({
      userId: user.id,
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

router.get("/research/history", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const reports = await db
    .select()
    .from(researchTable)
    .where(eq(researchTable.userId, user.id))
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
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  const [report] = await db
    .delete(researchTable)
    .where(
      and(
        eq(researchTable.id, params.data.id),
        eq(researchTable.userId, user.id),
      ),
    )
    .returning();
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// Local deterministic fallback used when no AI provider is configured.
// ---------------------------------------------------------------------------

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

function buildFallback(query: string): ReportData {
  const cat = detectCategory(query);
  const seed = [...query].reduce((s, c) => s + c.charCodeAt(0), 0);
  const rng = ((n: number) => (n * 9301 + 49297) % 233280 / 233280);
  const r = rng(seed);
  const demandScore = Math.round(40 + r * 55);
  const compRoll = rng(seed + 1);
  const competitionLevel: CompetitionLevel =
    compRoll < 0.2
      ? "low"
      : compRoll < 0.5
        ? "medium"
        : compRoll < 0.8
          ? "high"
          : "very-high";
  const suggestedPrice = 15 + Math.round(rng(seed + 2) * 55);
  const estimatedMargin = Math.round(55 + rng(seed + 3) * 30);
  const topNiches = (NICHES[cat] ?? NICHES.default)
    .slice(0, 4)
    .map((name, i) => ({ name, score: Math.round(60 + rng(seed + i) * 35) }))
    .sort((a, b) => b.score - a.score);
  const verdictScore = demandScore + (competitionLevel === "low" ? 20 : competitionLevel === "medium" ? 10 : competitionLevel === "high" ? -10 : -20);
  const verdict: Verdict =
    verdictScore >= 80
      ? "strong-buy"
      : verdictScore >= 60
        ? "buy"
        : verdictScore >= 45
          ? "hold"
          : "avoid";
  return {
    demandScore,
    competitionLevel,
    suggestedPrice,
    estimatedMargin,
    topNiches,
    pros: [
      "Strong organic search interest year-round",
      "Impulse-buy price point drives high conversion",
      "Low return rate typical for this category",
    ],
    cons: [
      "Market is saturated — differentiation is key",
      "Requires strong creative to stand out in ads",
      "Price-sensitive buyers comparison-shop heavily",
    ],
    verdict,
    summary: `"${query}" shows ${competitionLevel} competition with a demand score of ${demandScore}/100. At a suggested price of $${suggestedPrice}, you can expect around ${estimatedMargin}% margin.`,
    aiPowered: false,
  };
}

export default router;
