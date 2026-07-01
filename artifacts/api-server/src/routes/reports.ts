import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { gte, lte, and, eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

const PLQuerySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  groupBy: z.enum(["product", "supplier", "status"]).default("product"),
});

router.get("/reports/pl", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const parsed = PLQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { from, to, groupBy } = parsed.data;

  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    res.status(400).json({ error: "Invalid date format" });
    return;
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.userId, user.id),
        gte(ordersTable.createdAt, fromDate),
        lte(ordersTable.createdAt, toDate),
      ),
    );

  type Row = {
    label: string;
    orderCount: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
  };

  const grouped = new Map<string, Row>();

  for (const o of orders) {
    let label: string;
    if (groupBy === "supplier") {
      label = o.supplierName ?? "Unknown Supplier";
    } else if (groupBy === "status") {
      label = o.status.charAt(0).toUpperCase() + o.status.slice(1);
    } else {
      label = o.productName ?? "Unknown Product";
    }

    const qty = o.quantity ?? 1;
    const sell = o.sellPrice != null ? Number(o.sellPrice) : 0;
    const cost = o.costPrice != null ? Number(o.costPrice) : 0;
    const revenue = sell * qty;
    const cogs = cost * qty;

    const existing = grouped.get(label);
    if (existing) {
      existing.orderCount += 1;
      existing.revenue += revenue;
      existing.cogs += cogs;
      existing.grossProfit += revenue - cogs;
    } else {
      grouped.set(label, {
        label,
        orderCount: 1,
        revenue,
        cogs,
        grossProfit: revenue - cogs,
      });
    }
  }

  const rows = Array.from(grouped.values())
    .sort((a, b) => b.grossProfit - a.grossProfit)
    .map((r) => ({
      ...r,
      revenue: Math.round(r.revenue * 100) / 100,
      cogs: Math.round(r.cogs * 100) / 100,
      grossProfit: Math.round(r.grossProfit * 100) / 100,
      margin:
        r.revenue > 0
          ? Math.round((r.grossProfit / r.revenue) * 100 * 10) / 10
          : 0,
    }));

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCogs = rows.reduce((s, r) => s + r.cogs, 0);
  const totalGrossProfit = rows.reduce((s, r) => s + r.grossProfit, 0);
  const totalOrders = rows.reduce((s, r) => s + r.orderCount, 0);
  const totalMargin =
    totalRevenue > 0
      ? Math.round((totalGrossProfit / totalRevenue) * 100 * 10) / 10
      : 0;

  res.json({
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    groupBy,
    rows,
    revenue: Math.round(totalRevenue * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCogs: Math.round(totalCogs * 100) / 100,
    totalGrossProfit: Math.round(totalGrossProfit * 100) / 100,
    totalMargin,
    totalOrders,
  });
});

export default router;
