import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  ordersTable,
  purchaseOrdersTable,
  adCampaignsTable,
} from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/cash-flow/forecast", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const now = new Date();

  const [allOrders, allPOs, allCampaigns] = await Promise.all([
    db.select().from(ordersTable).where(eq(ordersTable.userId, user.id)),
    db
      .select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.userId, user.id)),
    db
      .select()
      .from(adCampaignsTable)
      .where(eq(adCampaignsTable.userId, user.id)),
  ]);

  const totalRevenue = allOrders
    .filter((o) => o.status !== "cancelled")
    .reduce(
      (s, o) => s + Number(o.sellPrice ?? 0) * Number(o.quantity ?? 1),
      0,
    );

  const totalCogs = allOrders
    .filter((o) => o.status !== "cancelled")
    .reduce(
      (s, o) => s + Number(o.costPrice ?? 0) * Number(o.quantity ?? 1),
      0,
    );

  const pendingRevenue = allOrders
    .filter((o) => ["pending", "processing", "shipped"].includes(o.status ?? ""))
    .reduce(
      (s, o) => s + Number(o.sellPrice ?? 0) * Number(o.quantity ?? 1),
      0,
    );

  const pendingCosts = allPOs
    .filter((p) => ["draft", "sent", "confirmed"].includes(p.status ?? ""))
    .reduce((s, p) => s + Number(p.totalCost ?? 0), 0);

  const activeAdSpend = allCampaigns
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + Number(c.spend ?? 0), 0);

  const totalProfit = totalRevenue - totalCogs;
  const netCashPosition = totalRevenue - totalCogs - activeAdSpend;

  const months: Record<
    string,
    { inflow: number; outflow: number; month: string }
  > = {};
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", {
      month: "short",
      year: "2-digit",
    });
    months[key] = { inflow: 0, outflow: 0, month: label };
  }

  for (const o of allOrders) {
    if (!o.createdAt || o.status === "cancelled") continue;
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (months[key]) {
      months[key].inflow += Number(o.sellPrice ?? 0) * Number(o.quantity ?? 1);
      months[key].outflow += Number(o.costPrice ?? 0) * Number(o.quantity ?? 1);
    }
  }

  for (const p of allPOs) {
    if (!p.createdAt || ["cancelled", "received"].includes(p.status ?? ""))
      continue;
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (months[key]) {
      months[key].outflow += Number(p.totalCost ?? 0);
    }
  }

  const cashFlowTimeline = Object.values(months).map((m) => ({
    ...m,
    net: m.inflow - m.outflow,
  }));

  const platformBreakdown = allCampaigns.reduce(
    (acc: Record<string, { spend: number; revenue: number }>, c) => {
      const p = c.platform ?? "other";
      if (!acc[p]) acc[p] = { spend: 0, revenue: 0 };
      acc[p].spend += Number(c.spend ?? 0);
      acc[p].revenue += Number(c.revenue ?? 0);
      return acc;
    },
    {},
  );

  res.json({
    summary: {
      totalRevenue,
      totalCogs,
      totalProfit,
      pendingRevenue,
      pendingCosts,
      activeAdSpend,
      netCashPosition,
      projectedNet30: pendingRevenue - pendingCosts,
    },
    cashFlowTimeline,
    platformBreakdown,
  });
});

export default router;
