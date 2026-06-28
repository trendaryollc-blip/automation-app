import { useListOrders, useListProducts } from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { BarChart2, TrendingUp, Package, DollarSign, ShoppingCart, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtFull(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#b45309"];
const BAR_COLOR = "#6366f1";

type SortKey = "profit" | "revenue" | "units" | "margin";

export default function AnalyticsPage() {
  const { data: orders = [], isLoading: ordersLoading } = useListOrders();
  const { data: products = [], isLoading: productsLoading } = useListProducts();
  const [sortBy, setSortBy] = useState<SortKey>("profit");
  const [chartMetric, setChartMetric] = useState<SortKey>("profit");

  const isLoading = ordersLoading || productsLoading;

  const productStats = useMemo(() => {
    const map = new Map<string, {
      productName: string;
      productId: number | null;
      units: number;
      revenue: number;
      cogs: number;
      profit: number;
      orderCount: number;
    }>();

    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const key = o.productName ?? "Unknown";
      const existing = map.get(key) ?? {
        productName: key,
        productId: o.productId ?? null,
        units: 0,
        revenue: 0,
        cogs: 0,
        profit: 0,
        orderCount: 0,
      };
      const qty = o.quantity ?? 1;
      const sell = o.sellPrice ?? 0;
      const cost = o.costPrice ?? 0;
      existing.units += qty;
      existing.revenue += sell * qty;
      existing.cogs += cost * qty;
      existing.profit += (sell - cost) * qty;
      existing.orderCount += 1;
      map.set(key, existing);
    }

    return Array.from(map.values())
      .map((s) => ({
        ...s,
        margin: s.revenue > 0 ? Math.round((s.profit / s.revenue) * 100) : 0,
      }))
      .sort((a, b) => b[sortBy] - a[sortBy]);
  }, [orders, sortBy]);

  const chartData = useMemo(() => {
    return [...productStats]
      .sort((a, b) => b[chartMetric] - a[chartMetric])
      .slice(0, 8)
      .map((s) => ({
        name: s.productName.length > 18 ? s.productName.slice(0, 18) + "…" : s.productName,
        value: Number(s[chartMetric].toFixed(2)),
      }));
  }, [productStats, chartMetric]);

  const totalRevenue = productStats.reduce((s, p) => s + p.revenue, 0);
  const totalProfit = productStats.reduce((s, p) => s + p.profit, 0);
  const totalUnits = productStats.reduce((s, p) => s + p.units, 0);
  const avgMargin = productStats.length > 0
    ? Math.round(productStats.reduce((s, p) => s + p.margin, 0) / productStats.length)
    : 0;

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "profit", label: "Profit" },
    { key: "revenue", label: "Revenue" },
    { key: "units", label: "Units Sold" },
    { key: "margin", label: "Margin %" },
  ];

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-primary" />
          Product Profitability
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Which products are actually making you money.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: fmt(totalRevenue), icon: DollarSign, color: "text-blue-400" },
          { label: "Total Profit", value: fmt(totalProfit), icon: TrendingUp, color: "text-green-400" },
          { label: "Units Sold", value: totalUnits.toLocaleString(), icon: ShoppingCart, color: "text-purple-400" },
          { label: "Avg Margin", value: `${avgMargin}%`, icon: BarChart2, color: "text-primary" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                {kpi.label}
              </div>
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Top Products by Metric</CardTitle>
            <div className="flex gap-1">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setChartMetric(o.key)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${chartMetric === o.key ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              No order data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => chartMetric === "margin" ? `${v}%` : `$${v}`} width={55} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
                  formatter={(v: number) => chartMetric === "margin" ? [`${v}%`, "Value"] : [fmtFull(v), "Value"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i < 3 ? ["#6366f1", "#8b5cf6", "#a78bfa"][i] : "#475569"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Product Leaderboard
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Sort by:</span>
              <div className="flex gap-1">
                {SORT_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setSortBy(o.key)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${sortBy === o.key ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {productStats.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No order data yet. Create some orders to see profitability.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-semibold text-muted-foreground text-xs w-10">#</th>
                    <th className="pb-2 text-left font-semibold text-muted-foreground text-xs">Product</th>
                    <th className="pb-2 text-right font-semibold text-muted-foreground text-xs">Units</th>
                    <th className="pb-2 text-right font-semibold text-muted-foreground text-xs">Revenue</th>
                    <th className="pb-2 text-right font-semibold text-muted-foreground text-xs">COGS</th>
                    <th className="pb-2 text-right font-semibold text-muted-foreground text-xs">Profit</th>
                    <th className="pb-2 text-right font-semibold text-muted-foreground text-xs">Margin</th>
                    <th className="pb-2 text-right font-semibold text-muted-foreground text-xs">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {productStats.map((p, i) => (
                    <tr key={p.productName} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? "bg-amber-500/20 text-amber-400" :
                            i === 1 ? "bg-slate-500/20 text-slate-300" :
                            i === 2 ? "bg-orange-700/20 text-orange-500" :
                            "bg-muted text-muted-foreground"
                          }`}
                        >
                          {i + 1}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="font-medium">{p.productName}</div>
                      </td>
                      <td className="py-3 text-right font-mono text-muted-foreground">{p.units}</td>
                      <td className="py-3 text-right font-mono text-blue-400">{fmtFull(p.revenue)}</td>
                      <td className="py-3 text-right font-mono text-muted-foreground">{fmtFull(p.cogs)}</td>
                      <td className="py-3 text-right font-mono font-semibold text-green-400">{fmtFull(p.profit)}</td>
                      <td className="py-3 text-right">
                        <Badge
                          variant="outline"
                          className={`text-xs font-mono ${
                            p.margin >= 60 ? "border-green-500/30 text-green-400 bg-green-500/10" :
                            p.margin >= 40 ? "border-blue-500/30 text-blue-400 bg-blue-500/10" :
                            "border-red-500/30 text-red-400 bg-red-500/10"
                          }`}
                        >
                          {p.margin}%
                        </Badge>
                      </td>
                      <td className="py-3 text-right text-muted-foreground">{p.orderCount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/20">
                    <td colSpan={2} className="py-3 text-xs font-semibold text-muted-foreground pl-1">TOTAL</td>
                    <td className="py-3 text-right font-mono text-sm font-semibold">{totalUnits}</td>
                    <td className="py-3 text-right font-mono text-sm font-semibold text-blue-400">{fmtFull(totalRevenue)}</td>
                    <td className="py-3 text-right font-mono text-sm text-muted-foreground">{fmtFull(totalRevenue - totalProfit)}</td>
                    <td className="py-3 text-right font-mono text-sm font-semibold text-green-400">{fmtFull(totalProfit)}</td>
                    <td className="py-3 text-right">
                      <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary bg-primary/10">
                        {avgMargin}%
                      </Badge>
                    </td>
                    <td className="py-3 text-right text-muted-foreground text-sm">{orders.filter(o => o.status !== "cancelled").length}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
