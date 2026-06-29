import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { adCampaignsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/ad-campaigns", async (_req, res) => {
  const all = await db
    .select()
    .from(adCampaignsTable)
    .orderBy(desc(adCampaignsTable.createdAt));
  res.json(all);
});

router.post("/ad-campaigns", async (req, res) => {
  const [campaign] = await db
    .insert(adCampaignsTable)
    .values(req.body)
    .returning();
  res.status(201).json(campaign);
});

router.patch("/ad-campaigns/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [updated] = await db
    .update(adCampaignsTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(eq(adCampaignsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/ad-campaigns/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(adCampaignsTable).where(eq(adCampaignsTable.id, id));
  res.json({ success: true });
});

router.get("/ad-campaigns/stats", async (_req, res) => {
  const all = await db.select().from(adCampaignsTable);
  const totalSpend = all.reduce((s: number, c: any) => s + Number(c.spend ?? 0), 0);
  const totalRevenue = all.reduce((s: number, c: any) => s + Number(c.revenue ?? 0), 0);
  const totalImpressions = all.reduce((s: number, c: any) => s + (c.impressions ?? 0), 0);
  const totalClicks = all.reduce((s: number, c: any) => s + (c.clicks ?? 0), 0);
  const totalConversions = all.reduce((s: number, c: any) => s + (c.conversions ?? 0), 0);
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

  const byPlatform = all.reduce((acc: Record<string, any>, c: any) => {
    const p = c.platform ?? "other";
    if (!acc[p])
      acc[p] = {
        platform: p,
        spend: 0,
        revenue: 0,
        conversions: 0,
        clicks: 0,
        campaigns: 0,
      };
    acc[p].spend += Number(c.spend ?? 0);
    acc[p].revenue += Number(c.revenue ?? 0);
    acc[p].conversions += c.conversions ?? 0;
    acc[p].clicks += c.clicks ?? 0;
    acc[p].campaigns += 1;
    return acc;
  }, {});

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
