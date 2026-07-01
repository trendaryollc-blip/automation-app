import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, desc, and } from "drizzle-orm";
import { db, adCampaignsTable } from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

const AdPlatformEnum = z.enum([
  "facebook",
  "instagram",
  "tiktok",
  "google",
  "youtube",
  "pinterest",
  "snapchat",
  "reddit",
  "other",
]);

const AdStatusEnum = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
]);

const CreateAdCampaignBodySchema = z.object({
  campaignName: z.string().min(1).max(200),
  platform: AdPlatformEnum.optional(),
  productId: z.number().int().positive().nullish(),
  productName: z.string().max(200).nullish(),
  spend: z.number().nonnegative().optional(),
  revenue: z.number().nonnegative().optional(),
  impressions: z.number().int().nonnegative().optional(),
  clicks: z.number().int().nonnegative().optional(),
  conversions: z.number().int().nonnegative().optional(),
  status: AdStatusEnum.optional(),
  startDate: z.union([z.string(), z.date()]).nullish(),
  endDate: z.union([z.string(), z.date()]).nullish(),
  notes: z.string().max(4000).nullish(),
});

const UpdateAdCampaignBodySchema = CreateAdCampaignBodySchema.partial();

const IdParamSchema = z.object({ id: z.coerce.number().int().positive() });

router.get("/ad-campaigns", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const all = await db
    .select()
    .from(adCampaignsTable)
    .where(eq(adCampaignsTable.userId, user.id))
    .orderBy(desc(adCampaignsTable.createdAt));
  res.json(all);
});

router.post("/ad-campaigns", async (req, res): Promise<void> => {
  const parsed = CreateAdCampaignBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const {
    campaignName,
    platform,
    productId,
    productName,
    spend,
    revenue,
    impressions,
    clicks,
    conversions,
    status,
    startDate,
    endDate,
    notes,
  } = parsed.data;
  const [campaign] = await db
    .insert(adCampaignsTable)
    .values({
      userId: user.id,
      campaignName,
      platform: platform ?? "facebook",
      productId: productId ?? null,
      productName: productName ?? null,
      spend: String(spend ?? 0),
      revenue: String(revenue ?? 0),
      impressions: impressions ?? 0,
      clicks: clicks ?? 0,
      conversions: conversions ?? 0,
      status: status ?? "active",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      notes: notes ?? null,
    })
    .returning();
  res.status(201).json(campaign);
});

router.patch("/ad-campaigns/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAdCampaignBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: new Date(),
  };
  if (parsed.data.spend !== undefined) {
    updateData.spend = String(parsed.data.spend);
  }
  if (parsed.data.revenue !== undefined) {
    updateData.revenue = String(parsed.data.revenue);
  }
  if (parsed.data.startDate !== undefined) {
    updateData.startDate =
      parsed.data.startDate != null ? new Date(parsed.data.startDate) : null;
  }
  if (parsed.data.endDate !== undefined) {
    updateData.endDate =
      parsed.data.endDate != null ? new Date(parsed.data.endDate) : null;
  }
  const [updated] = await db
    .update(adCampaignsTable)
    .set(updateData)
    .where(
      and(
        eq(adCampaignsTable.id, params.data.id),
        eq(adCampaignsTable.userId, user.id),
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/ad-campaigns/:id", async (req, res): Promise<void> => {
  const params = IdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  await db
    .delete(adCampaignsTable)
    .where(
      and(
        eq(adCampaignsTable.id, params.data.id),
        eq(adCampaignsTable.userId, user.id),
      ),
    );
  res.json({ success: true });
});

router.get("/ad-campaigns/stats", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const all = await db
    .select()
    .from(adCampaignsTable)
    .where(eq(adCampaignsTable.userId, user.id));

  const totalSpend = all.reduce((s, c) => s + Number(c.spend ?? 0), 0);
  const totalRevenue = all.reduce((s, c) => s + Number(c.revenue ?? 0), 0);
  const totalImpressions = all.reduce((s, c) => s + (c.impressions ?? 0), 0);
  const totalClicks = all.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const totalConversions = all.reduce((s, c) => s + (c.conversions ?? 0), 0);
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

  const byPlatform: Record<string, any> = {};
  for (const c of all) {
    const p = c.platform ?? "other";
    if (!byPlatform[p]) {
      byPlatform[p] = {
        platform: p,
        spend: 0,
        revenue: 0,
        conversions: 0,
        clicks: 0,
        campaigns: 0,
      };
    }
    byPlatform[p].spend += Number(c.spend ?? 0);
    byPlatform[p].revenue += Number(c.revenue ?? 0);
    byPlatform[p].conversions += c.conversions ?? 0;
    byPlatform[p].clicks += c.clicks ?? 0;
    byPlatform[p].campaigns += 1;
  }

  res.json({
    totalSpend,
    totalRevenue,
    roas,
    ctr,
    cpc,
    cpa,
    totalImpressions,
    totalClicks,
    totalConversions,
    activeCampaigns: all.filter((c) => c.status === "active").length,
    byPlatform: Object.values(byPlatform).map((p: any) => ({
      ...p,
      roas: p.spend > 0 ? p.revenue / p.spend : 0,
    })),
  });
});

export default router;
