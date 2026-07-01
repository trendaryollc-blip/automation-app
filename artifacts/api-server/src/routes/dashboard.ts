import { Router, type IRouter } from "express";
import { eq, desc, count, sql, gte, and } from "drizzle-orm";
import {
  db,
  productsTable,
  suppliersTable,
  ordersTable,
} from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

function safeNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getCounts(userId: number) {
  try {
    const [productStats] = await db
      .select({ total: count() })
      .from(productsTable)
      .where(eq(productsTable.userId, userId));
    const [supplierStats] = await db
      .select({ total: count() })
      .from(suppliersTable)
      .where(eq(suppliersTable.userId, userId));
    const [orderStats] = await db
      .select({
        total: count(),
        totalRevenue: sql<string>`coalesce(sum(sell_price * quantity), 0)`,
        totalProfit: sql<string>`coalesce(sum(profit), 0)`,
      })
      .from(ordersTable)
      .where(eq(ordersTable.userId, userId));
    const [pendingStats] = await db
      .select({ total: count() })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.userId, userId),
          eq(ordersTable.status, "pending"),
        ),
      );
    const [deliveredStats] = await db
      .select({ total: count() })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.userId, userId),
          eq(ordersTable.status, "delivered"),
        ),
      );
    return {
      productStats,
      supplierStats,
      orderStats,
      pendingStats,
      deliveredStats,
    };
  } catch {
    return {
      productStats: undefined,
      supplierStats: undefined,
      orderStats: undefined,
      pendingStats: undefined,
      deliveredStats: undefined,
    };
  }
}

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const {
    productStats,
    supplierStats,
    orderStats,
    pendingStats,
    deliveredStats,
  } = await getCounts(user.id);

  const totalOrders = safeNumber(orderStats?.total ?? 0);
  const delivered = safeNumber(deliveredStats?.total ?? 0);
  const conversionRate =
    totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0;

  let listedProducts: Array<Record<string, unknown>> = [];
  try {
    listedProducts = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.userId, user.id),
          eq(productsTable.status, "listed"),
        ),
      );
  } catch {
    listedProducts = [];
  }

  let totalMargin = 0;
  let marginCount = 0;
  for (const p of listedProducts) {
    if (p.costPrice != null && p.sellPrice != null && Number(p.sellPrice) > 0) {
      totalMargin +=
        ((Number(p.sellPrice) - Number(p.costPrice)) / Number(p.sellPrice)) *
        100;
      marginCount++;
    }
  }
  const avgMargin = marginCount > 0 ? Math.round(totalMargin / marginCount) : 0;

  res.json({
    totalRevenue: safeNumber(orderStats?.totalRevenue ?? 0),
    totalProfit: safeNumber(orderStats?.totalProfit ?? 0),
    totalOrders,
    totalProducts: safeNumber(productStats?.total ?? 0),
    activeSuppliers: safeNumber(supplierStats?.total ?? 0),
    pendingOrders: safeNumber(pendingStats?.total ?? 0),
    conversionRate,
    avgMargin,
  });
});

router.get("/dashboard/analytics", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const period =
    (req.query.period as string) === "monthly" ? "monthly" : "weekly";
  const now = new Date();

  type Bucket = {
    date: string;
    revenue: number;
    profit: number;
    orderCount: number;
  };

  let buckets: Bucket[];
  let windowStart: Date;
  let prevStart: Date;
  let prevEnd: Date;
  let bucketOf: (d: Date) => number;

  if (period === "weekly") {
    const DAY = 86400000;
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    windowStart = new Date(today.getTime() - 6 * DAY);
    prevStart = new Date(windowStart.getTime() - 7 * DAY);
    prevEnd = windowStart;

    buckets = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
      (date) => ({ date, revenue: 0, profit: 0, orderCount: 0 }),
    );

    bucketOf = (d: Date) => {
      const diff = new Date(d).setHours(0, 0, 0, 0) - windowStart.getTime();
      const idx = Math.floor(diff / DAY);
      return idx >= 0 && idx < 7 ? idx : -1;
    };
  } else {
    windowStart = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
    prevStart = new Date(now.getFullYear() - 2, now.getMonth() + 1, 1);
    prevEnd = windowStart;

    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    buckets = months.map((date) => ({ date, revenue: 0, profit: 0, orderCount: 0 }));

    bucketOf = (d: Date) => {
      const months2 =
        (d.getFullYear() - windowStart.getFullYear()) * 12 +
        (d.getMonth() - windowStart.getMonth());
      return months2 >= 0 && months2 < 12 ? months2 : -1;
    };
  }

  let allOrders: Array<Record<string, any>> = [];
  try {
    allOrders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.userId, user.id),
          gte(ordersTable.createdAt, windowStart),
        ),
      );
  } catch {
    allOrders = [];
  }

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

  let prevOrders: Array<Record<string, unknown>> = [];
  try {
    prevOrders = await db
      .select({
        revenue: sql<string>`coalesce(sum(sell_price * quantity), 0)`,
        profit: sql<string>`coalesce(sum(profit), 0)`,
        cnt: count(),
      })
      .from(ordersTable)
      .where(
        sql`user_id = ${user.id} and created_at >= ${prevStart} and created_at < ${prevEnd}`,
      );
  } catch {
    prevOrders = [];
  }

  const prevRevenue = safeNumber(prevOrders[0]?.revenue ?? 0);
  const prevProfit = safeNumber(prevOrders[0]?.profit ?? 0);
  const prevOrderCount = safeNumber(prevOrders[0]?.cnt ?? 0);

  const pctChange = (curr: number, prev: number) =>
    prev === 0
      ? curr > 0
        ? 100
        : 0
      : Math.round(((curr - prev) / prev) * 100);

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

router.get("/dashboard/recent-orders", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, user.id))
    .orderBy(desc(ordersTable.createdAt))
    .limit(10);
  res.json(
    orders.map((o) => ({
      ...o,
      costPrice: o.costPrice != null ? Number(o.costPrice) : null,
      sellPrice: o.sellPrice != null ? Number(o.sellPrice) : null,
      profit: o.profit != null ? Number(o.profit) : null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      placedAt: o.placedAt != null ? o.placedAt.toISOString() : null,
    })),
  );
});

export default router;
