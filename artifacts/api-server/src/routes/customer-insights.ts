import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/orders/customer-insights", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const allOrders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, user.id))
    .orderBy(desc(ordersTable.createdAt));

  type CustomerBucket = {
    customerName: string;
    customerEmail: string | null;
    totalRevenue: number;
    totalProfit: number;
    productCounts: Map<string, number>;
    orders: typeof allOrders;
  };

  const map = new Map<string, CustomerBucket>();

  for (const o of allOrders) {
    const key =
      o.customerEmail?.trim().toLowerCase() ||
      o.customerName.trim().toLowerCase();

    if (!map.has(key)) {
      map.set(key, {
        customerName: o.customerName,
        customerEmail: o.customerEmail ?? null,
        totalRevenue: 0,
        totalProfit: 0,
        productCounts: new Map(),
        orders: [],
      });
    }

    const bucket = map.get(key)!;
    const sell = o.sellPrice != null ? Number(o.sellPrice) : 0;
    const qty = o.quantity ?? 1;
    const profit = o.profit != null ? Number(o.profit) : 0;

    bucket.totalRevenue += sell * qty;
    bucket.totalProfit += profit;

    if (o.productName) {
      bucket.productCounts.set(
        o.productName,
        (bucket.productCounts.get(o.productName) ?? 0) + 1,
      );
    }

    bucket.orders.push(o);
  }

  const formatOrder = (o: (typeof allOrders)[number]) => ({
    ...o,
    costPrice: o.costPrice != null ? Number(o.costPrice) : null,
    sellPrice: o.sellPrice != null ? Number(o.sellPrice) : null,
    profit: o.profit != null ? Number(o.profit) : null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    placedAt: o.placedAt != null ? o.placedAt.toISOString() : null,
  });

  const insights = Array.from(map.values())
    .map((b) => {
      const orderCount = b.orders.length;
      const sorted = [...b.orders].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      const topProduct =
        b.productCounts.size > 0
          ? [...b.productCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
          : null;

      return {
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        orderCount,
        totalRevenue: Math.round(b.totalRevenue * 100) / 100,
        totalProfit: Math.round(b.totalProfit * 100) / 100,
        avgOrderValue: Math.round((b.totalRevenue / orderCount) * 100) / 100,
        firstOrderAt: sorted[0].createdAt.toISOString(),
        lastOrderAt: sorted[sorted.length - 1].createdAt.toISOString(),
        topProduct,
        orders: b.orders.map(formatOrder),
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  res.json({
    totalCustomers: insights.length,
    customers: insights,
  });
});

export default router;
