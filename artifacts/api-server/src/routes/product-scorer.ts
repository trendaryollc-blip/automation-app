import { Router, type IRouter } from "express";
import { scoreProduct } from "../services/ai.js";

const router: IRouter = Router();

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

const PLATFORM_WEIGHTS: Record<string, Record<string, number>> = {
  tech: { tiktok: 75, facebook: 82, instagram: 70, google: 90 },
  health: { tiktok: 88, facebook: 85, instagram: 84, google: 80 },
  home: { tiktok: 70, facebook: 80, instagram: 82, google: 78 },
  beauty: { tiktok: 92, facebook: 78, instagram: 90, google: 72 },
  outdoor: { tiktok: 65, facebook: 76, instagram: 71, google: 85 },
  pet: { tiktok: 85, facebook: 82, instagram: 80, google: 75 },
  kitchen: { tiktok: 80, facebook: 78, instagram: 74, google: 76 },
  default: { tiktok: 72, facebook: 74, instagram: 70, google: 70 },
};

const HOOK_ANGLES: Record<string, string[]> = {
  tech: [
    "Problem/Solution demo",
    "Before & After productivity",
    "Unboxing + wow moment",
    "Side-by-side comparison",
  ],
  health: [
    "Transformation story",
    "Expert tip reveal",
    "Challenge/routine format",
    "Results-focused testimonial",
  ],
  beauty: [
    "GRWM integration",
    "Skin transformation",
    "Product hack reveal",
    "Tutorial walkthrough",
  ],
  home: [
    "Organization before/after",
    "Room makeover reveal",
    "Life hack format",
    "Day-in-the-life feature",
  ],
  default: [
    "Curiosity hook (watch till end)",
    "Social proof montage",
    "Problem agitation",
    "Lifestyle integration",
  ],
};

function detectCategory(q: string): string {
  const s = q.toLowerCase();
  if (
    /phone|laptop|charge|cable|usb|tech|gadget|electronic|watch|earbud|speaker/.test(
      s,
    )
  )
    return "tech";
  if (
    /health|fitness|gym|yoga|posture|muscle|workout|exercise|supplement/.test(s)
  )
    return "health";
  if (/home|decor|light|candle|plant|organiz|storage|bedroom|living/.test(s))
    return "home";
  if (/beauty|skin|hair|lip|face|makeup|serum|cream|mask/.test(s))
    return "beauty";
  if (/outdoor|camp|hike|hunt|fish|garden|sport|bike|tent/.test(s))
    return "outdoor";
  if (/pet|dog|cat|animal|paw|leash|treat/.test(s)) return "pet";
  if (/cook|food|blender|coffee|cup|mug|bottle|tumbler|meal/.test(s))
    return "kitchen";
  return "default";
}

function fallbackScore(
  name: string,
  inputCategory: string | undefined,
  costPrice?: number,
  sellPrice?: number,
) {
  const rand = seededRandom(
    (name + (inputCategory ?? "")).toLowerCase().trim(),
  );
  const category = inputCategory?.toLowerCase() ?? detectCategory(name);
  const weights = PLATFORM_WEIGHTS[category] ?? PLATFORM_WEIGHTS.default;
  const noise = () => Math.round((rand() - 0.5) * 18);
  const platformScores = {
    tiktok: Math.min(100, Math.max(10, weights.tiktok + noise())),
    facebook: Math.min(100, Math.max(10, weights.facebook + noise())),
    instagram: Math.min(100, Math.max(10, weights.instagram + noise())),
    google: Math.min(100, Math.max(10, weights.google + noise())),
  };
  const viralityScore = Math.round(
    platformScores.tiktok * 0.35 +
      platformScores.facebook * 0.25 +
      platformScores.instagram * 0.25 +
      platformScores.google * 0.15,
  );
  const saturationRoll = rand();
  const saturation =
    saturationRoll < 0.25
      ? "low"
      : saturationRoll < 0.6
        ? "medium"
        : saturationRoll < 0.85
          ? "high"
          : "very-high";
  const trendMomentum =
    rand() < 0.4 ? "rising" : rand() < 0.7 ? "stable" : "peaking";
  const impulseScore = Math.round(40 + rand() * 55);
  const estimatedCpm = `$${(8 + rand() * 22).toFixed(2)}`;
  const windowRoll = rand();
  const launchWindow =
    windowRoll < 0.3
      ? "Launch now — trend is rising"
      : windowRoll < 0.6
        ? "Optimal window: next 2–4 weeks"
        : windowRoll < 0.8
          ? "Window closing — act this week"
          : "Saturated — differentiate or skip";
  const hooks = HOOK_ANGLES[category] ?? HOOK_ANGLES.default;
  const hookAngles = hooks.slice(0, 2);
  const margin =
    sellPrice && costPrice && costPrice > 0
      ? Math.round(((sellPrice - costPrice) / sellPrice) * 100)
      : null;
  const verdict =
    viralityScore >= 80
      ? "🔥 High Potential"
      : viralityScore >= 65
        ? "✅ Solid Pick"
        : viralityScore >= 50
          ? "⚠️ Test First"
          : "❌ Risky";
  return {
    name,
    viralityScore,
    platformScores,
    saturation,
    trendMomentum,
    impulseScore,
    estimatedCpm,
    launchWindow,
    hookAngles,
    margin,
    verdict,
    category,
    aiPowered: false,
  };
}

router.post("/products/score", async (req, res) => {
  const {
    name,
    category: inputCategory,
    costPrice,
    sellPrice,
  } = req.body as {
    name?: string;
    category?: string;
    costPrice?: number;
    sellPrice?: number;
  };
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  try {
    const raw = await scoreProduct(
      name,
      inputCategory ?? detectCategory(name),
      costPrice,
      sellPrice,
    );
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    const margin =
      sellPrice && costPrice && costPrice > 0
        ? Math.round(((sellPrice - costPrice) / sellPrice) * 100)
        : null;
    res.json({
      name,
      margin,
      category: inputCategory ?? detectCategory(name),
      aiPowered: true,
      ...json,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "NO_AI_KEYS") {
      res.json(fallbackScore(name, inputCategory, costPrice, sellPrice));
    } else {
      res.json({
        ...fallbackScore(name, inputCategory, costPrice, sellPrice),
        aiError: msg,
      });
    }
  }
});

export default router;
