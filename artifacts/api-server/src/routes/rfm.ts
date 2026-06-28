import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/customers/rfm", async (_req, res) => {
  const orders = await db.select().from(ordersTable);
  const now = Date.now();

  const map: Record<
    string,
    {
      name: string;
      email: string | null;
      orders: typeof orders;
      lastOrderDate: number;
      totalSpend: number;
      orderCount: number;
    }
  > = {};

  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const key = (o.customerEmail || o.customerName || "").toLowerCase().trim();
    if (!key) continue;
    if (!map[key]) {
      map[key] = {
        name: o.customerName ?? "Unknown",
        email: o.customerEmail ?? null,
        orders: [],
        lastOrderDate: 0,
        totalSpend: 0,
        orderCount: 0,
      };
    }
    const c = map[key];
    c.orders.push(o);
    const ts = o.createdAt ? new Date(o.createdAt).getTime() : 0;
    if (ts > c.lastOrderDate) c.lastOrderDate = ts;
    c.totalSpend += Number(o.sellPrice ?? 0) * Number(o.quantity ?? 1);
    c.orderCount++;
  }

  const customers = Object.values(map);
  if (!customers.length) {
    res.json({ customers: [], segments: {} });
    return;
  }

  const recencies = customers.map((c) =>
    Math.floor((now - c.lastOrderDate) / 86400000),
  );
  const frequencies = customers.map((c) => c.orderCount);
  const monetaries = customers.map((c) => c.totalSpend);

  function percentileScore(arr: number[], val: number, invert = false): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = sorted.filter((x) => x <= val).length;
    const pct = idx / sorted.length;
    const score = invert ? 1 - pct : pct;
    return Math.min(5, Math.max(1, Math.round(score * 4) + 1));
  }

  const scored = customers.map((c, i) => {
    const r = percentileScore(recencies, recencies[i], true);
    const f = percentileScore(frequencies, frequencies[i]);
    const m = percentileScore(monetaries, monetaries[i]);
    const rfmScore = r * 100 + f * 10 + m;

    let segment: string;
    if (r >= 4 && f >= 4 && m >= 4) segment = "Champions";
    else if (r >= 3 && f >= 3 && m >= 3) segment = "Loyal";
    else if (r >= 4 && f <= 2) segment = "New Customers";
    else if (r >= 3 && f >= 2 && m >= 2) segment = "Promising";
    else if (r <= 2 && f >= 3 && m >= 3) segment = "At Risk";
    else if (r <= 2 && f >= 4 && m >= 4) segment = "Cant Lose Them";
    else if (r <= 1 && f <= 2) segment = "Lost";
    else segment = "Needs Attention";

    const daysSinceLast = recencies[i];
    return {
      name: c.name,
      email: c.email,
      r,
      f,
      m,
      rfmScore,
      segment,
      daysSinceLast,
      orderCount: c.orderCount,
      totalSpend: c.totalSpend,
      avgOrder: c.totalSpend / Math.max(c.orderCount, 1),
    };
  });

  const segmentCounts: Record<string, number> = {};
  for (const c of scored) {
    segmentCounts[c.segment] = (segmentCounts[c.segment] ?? 0) + 1;
  }

  res.json({
    customers: scored.sort((a, b) => b.rfmScore - a.rfmScore),
    segments: segmentCounts,
    totalCustomers: scored.length,
    avgSpend:
      scored.reduce((s, c) => s + c.totalSpend, 0) / Math.max(scored.length, 1),
  });
});

export default router;
