import { useMemo, useState } from "react";
import { Zap, TrendingUp, AlertTriangle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useListOrders, useListProducts } from "@workspace/api-client-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

const WINDOWS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

export default function VelocityPage() {
  const { data: allOrders = [], isLoading } = useListOrders();
  const { data: products = [] } = useListProducts();
  const [window, setWindow] = useState(30);

  const velocities = useMemo(() => {
    const now = Date.now();
    const cutoff = now - window * 24 * 60 * 60 * 1000;
    const recentOrders = allOrders.filter((o) => {
      const t = o.createdAt ? new Date(o.createdAt).getTime() : 0;
      return t >= cutoff && o.status !== "cancelled";
    });

    const productMap: Record<
      string,
      { name: string; units: number; revenue: number; productId: number | null }
    > = {};
    for (const o of recentOrders) {
      const key = o.productName || "Unknown";
      if (!productMap[key])
        productMap[key] = {
          name: key,
          units: 0,
          revenue: 0,
          productId: o.productId ?? null,
        };
      productMap[key].units += Number(o.quantity ?? 1);
      productMap[key].revenue +=
        Number(o.sellPrice ?? 0) * Number(o.quantity ?? 1);
    }

    return Object.values(productMap)
      .map((v) => {
        const unitsPerDay = v.units / window;
        const product = products.find((p) => p.id === v.productId);
        const stock = product?.stockQuantity ?? null;
        const daysLeft =
          stock != null && unitsPerDay > 0
            ? Math.floor(stock / unitsPerDay)
            : null;
        return {
          ...v,
          unitsPerDay,
          stock,
          daysLeft,
          reorderThreshold: product?.stockThreshold ?? null,
          urgency:
            daysLeft != null && daysLeft < 7
              ? "critical"
              : daysLeft != null && daysLeft < 14
                ? "warning"
                : "ok",
        };
      })
      .sort((a, b) => b.unitsPerDay - a.unitsPerDay);
  }, [allOrders, products, window]);

  const critical = velocities.filter((v) => v.urgency === "critical").length;
  const warning = velocities.filter((v) => v.urgency === "warning").length;
  const totalUnits = velocities.reduce((s, v) => s + v.units, 0);

  const chartData = velocities.slice(0, 8).map((v) => ({
    name: v.name.length > 14 ? v.name.slice(0, 13) + "…" : v.name,
    unitsPerDay: parseFloat(v.unitsPerDay.toFixed(2)),
    daysLeft: v.daysLeft,
  }));

  if (isLoading)
    return (
      <div className="p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" /> Sales Velocity
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            How fast each product is selling — and when you'll run out of stock.
          </p>
        </div>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w.days}
              onClick={() => setWindow(w.days)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${window === w.days ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Units Sold</div>
            <div className="text-2xl font-bold">{totalUnits}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">
              Products Tracked
            </div>
            <div className="text-2xl font-bold">{velocities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400" /> Critical Stock
            </div>
            <div className="text-2xl font-bold text-red-400">{critical}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-yellow-400" /> Low Stock
            </div>
            <div className="text-2xl font-bold text-yellow-400">{warning}</div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" /> Top Sellers —
              Units/Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}/d`}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v} units/day`, "Velocity"]}
                  />
                  <Bar dataKey="unitsPerDay" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          d.daysLeft != null && d.daysLeft < 7
                            ? "#f87171"
                            : d.daysLeft != null && d.daysLeft < 14
                              ? "#fbbf24"
                              : "#818cf8"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {velocities.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <Zap className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="font-medium">No sales data in this window</p>
          </Card>
        ) : (
          velocities.map((v, i) => (
            <Card
              key={i}
              className={
                v.urgency === "critical"
                  ? "border-red-500/40"
                  : v.urgency === "warning"
                    ? "border-yellow-500/40"
                    : ""
              }
            >
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{v.name}</span>
                      {v.urgency === "critical" && (
                        <Badge className="text-xs bg-red-500/10 text-red-400 border-red-500/20">
                          ⚠ Critical — reorder now
                        </Badge>
                      )}
                      {v.urgency === "warning" && (
                        <Badge className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                          Low stock
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>
                        <span className="font-medium text-foreground">
                          {v.units}
                        </span>{" "}
                        units sold
                      </span>
                      <span>
                        <span className="font-medium text-foreground">
                          {v.unitsPerDay.toFixed(2)}
                        </span>{" "}
                        per day
                      </span>
                      <span>
                        Revenue:{" "}
                        <span className="font-medium text-foreground">
                          {fmt(v.revenue)}
                        </span>
                      </span>
                      {v.stock != null && (
                        <span>
                          Stock:{" "}
                          <span
                            className={`font-medium ${v.urgency === "critical" ? "text-red-400" : v.urgency === "warning" ? "text-yellow-400" : "text-foreground"}`}
                          >
                            {v.stock} units
                          </span>
                        </span>
                      )}
                      {v.daysLeft != null && (
                        <span>
                          ~
                          <span
                            className={`font-medium ${v.urgency === "critical" ? "text-red-400" : v.urgency === "warning" ? "text-yellow-400" : "text-green-400"}`}
                          >
                            {v.daysLeft} days
                          </span>{" "}
                          left
                        </span>
                      )}
                    </div>
                  </div>
                  {v.daysLeft != null && (
                    <div
                      className={`text-right shrink-0 ${v.urgency === "critical" ? "text-red-400" : v.urgency === "warning" ? "text-yellow-400" : "text-green-400"}`}
                    >
                      <div className="text-2xl font-bold">{v.daysLeft}d</div>
                      <div className="text-xs">until stockout</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
