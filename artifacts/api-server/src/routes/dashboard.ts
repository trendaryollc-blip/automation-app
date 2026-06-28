import { Router, type IRouter } from "express";
import { eq, desc, count, sql, gte, lt } from "drizzle-orm";
import { db, productsTable, suppliersTable, ordersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [productStats] = await db
    .select({ total: count() })
    .from(productsTable);

  const [supplierStats] = await db
    .select({ total: count() })
    .from(suppliersTable);

  const [orderStats] = await db
    .select({
      total: count(),
      totalRevenue: sql<string>`coalesce(sum(sell_price * quantity), 0)`,
      totalProfit: sql<string>`coalesce(sum(profit), 0)`,
    })
    .from(ordersTable);

  const [pendingStats] = await db
    .select({ total: count() })
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending"));

  const [deliveredStats] = await db
    .select({ total: count() })
    .from(ordersTable)
    .where(eq(ordersTable.status, "delivered"));

  const totalOrders = Number(orderStats?.total ?? 0);
  const delivered = Number(deliveredStats?.total ?? 0);
  const conversionRate = totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0;

  const listedProducts = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.status, "listed"));

  let totalMargin = 0;
  let marginCount = 0;
  for (const p of listedProducts) {
    if (p.costPrice != null && p.sellPrice != null && Number(p.sellPrice) > 0) {
      totalMargin += ((Number(p.sellPrice) - Number(p.costPrice)) / Number(p.sellPrice)) * 100;
      marginCount++;
    }
  }
  const avgMargin = marginCount > 0 ? Math.round(totalMargin / marginCount) : 0;

  res.json({
    totalRevenue: Number(orderStats?.totalRevenue ?? 0),
    totalProfit: Number(orderStats?.totalProfit ?? 0),
    totalOrders,
    totalProducts: Number(productStats?.total ?? 0),
    activeSuppliers: Number(supplierStats?.total ?? 0),
    pendingOrders: Number(pendingStats?.total ?? 0),
    conversionRate,
    avgMargin,
  });
});

router.get("/dashboard/analytics", async (req, res): Promise<void> => {
  const period = (req.query.period as string) === "monthly" ? "monthly" : "weekly";
  const now = new Date();

  type Bucket = { date: string; revenue: number; profit: number; orderCount: number };

  function buildBuckets(count: number, labelFn: (d: Date) => string, startFn: (i: number) => Date): Bucket[] {
    return Array.from({ length: count }, (_, i) => ({
      date: labelFn(startFn(i)),
      revenue: 0,
      profit: 0,
      orderCount: 0,
    }));
  }

  function toMidnight(d: Date): Date {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
  }

  let buckets: Bucket[];
  let windowStart: Date;
  let prevStart: Date;
  let prevEnd: Date;
  let bucketOf: (d: Date) => number;

  if (period === "weekly") {
    const DAY = 86400000;
    const today = toMidnight(now);
    windowStart = new Date(today.getTime() - 6 * DAY);
    prevStart = new Date(windowStart.getTime() - 7 * DAY);
    prevEnd = windowStart;

    buckets = buildBuckets(7, (d) => {
      return d.toLocaleDateString("en-US", { weekday: "short" });
    }, (i) => new Date(windowStart.getTime() + i * DAY));

    bucketOf = (d: Date) => {
      const diff = toMidnight(d).getTime() - windowStart.getTime();
      const idx = Math.floor(diff / DAY);
      return idx >= 0 && idx < 7 ? idx : -1;
    };
  } else {
    // monthly — last 12 calendar months
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    windowStart = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
    prevStart = new Date(now.getFullYear() - 2, now.getMonth() + 1, 1);
    prevEnd = windowStart;

    buckets = buildBuckets(12, (d) => {
      return d.toLocaleDateString("en-US", { month: "short" });
    }, (i) => {
      return new Date(windowStart.getFullYear(), windowStart.getMonth() + i, 1);
    });
    void endOfMonth;

    bucketOf = (d: Date) => {
      const months =
        (d.getFullYear() - windowStart.getFullYear()) * 12 +
        (d.getMonth() - windowStart.getMonth());
      return months >= 0 && months < 12 ? months : -1;
    };
  }

  const allOrders = await db
    .select()
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, windowStart));

  for (const o of allOrders) {
    const idx = bucketOf(o.createdAt);
    if (idx < 0) continue;
    const sell = o.sellPrice != null ? Number(o.sellPrice) : 0;
    const qty = o.quantity ?? 1;
    const profit = o.profit != null ? Number(o.profit) : 0;
    buckets[idx].revenue += sell * qty;
    buckets[idx].profit += profit;
    buckets[idx].orderCount += 1;
  }

  const totalRevenue = buckets.reduce((s, b) => s + b.revenue, 0);
  const totalProfit = buckets.reduce((s, b) => s + b.profit, 0);
  const totalOrders = buckets.reduce((s, b) => s + b.orderCount, 0);

  // Previous period totals for change %
  const prevOrders = await db
    .select({
      revenue: sql<string>`coalesce(sum(sell_price * quantity), 0)`,
      profit: sql<string>`coalesce(sum(profit), 0)`,
      cnt: count(),
    })
    .from(ordersTable)
    .where(sql`created_at >= ${prevStart} and created_at < ${prevEnd}`);

  const prevRevenue = Number(prevOrders[0]?.revenue ?? 0);
  const prevProfit = Number(prevOrders[0]?.profit ?? 0);
  const prevOrderCount = Number(prevOrders[0]?.cnt ?? 0);

  const pctChange = (curr: number, prev: number) =>
    prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

  res.json({
    period,
    data: buckets.map((b) => ({
      ...b,
      revenue: Math.round(b.revenue * 100) / 100,
      profit: Math.round(b.profit * 100) / 100,
    })),
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalOrders,
    revenueChange: pctChange(totalRevenue, prevRevenue),
    profitChange: pctChange(totalProfit, prevProfit),
    ordersChange: pctChange(totalOrders, prevOrderCount),
  });
});

router.get("/dashboard/recent-orders", async (_req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(10);
  const result = orders.map((o) => ({
    ...o,
    costPrice: o.costPrice != null ? Number(o.costPrice) : null,
    sellPrice: o.sellPrice != null ? Number(o.sellPrice) : null,
    profit: o.profit != null ? Number(o.profit) : null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    placedAt: o.placedAt != null ? o.placedAt.toISOString() : null,
  }));
  res.json(result);
});

export default router;
