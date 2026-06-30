import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useListSuppliers,
  useListOrders,
  useListProducts,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Truck,
  TrendingUp,
  Package,
  CheckCircle,
  BarChart2,
  ArrowUpDown,
  Star,
  AlertTriangle,
  XCircle,
  Zap,
  Trophy,
  ThumbsDown,
  ThumbsUp,
  RotateCcw,
  ChevronRight,
  Shield,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from "recharts";

const API = "/api";

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

// ── Composite score calculation ────────────────────────────────────────────
function calcScore(s: Scorecard): number {
  if (s.totalOrders === 0) return 0;
  const fulfillment = s.deliveredPct; // 0-100, weight 35%
  const marginScore = Math.min(s.margin * 2, 100); // 0-100 (50%+ margin = max), weight 30%
  const cancelPenalty = Math.max(0, 100 - s.cancelledPct * 2); // 0-100, weight 20%
  const volumeScore = Math.min(s.totalOrders * 5, 100); // 0-100, weight 15%
  return Math.round(
    fulfillment * 0.35 +
      marginScore * 0.3 +
      cancelPenalty * 0.2 +
      volumeScore * 0.15,
  );
}

function getGrade(score: number): {
  grade: string;
  color: string;
  bg: string;
  border: string;
} {
  if (score >= 90)
    return {
      grade: "A+",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
    };
  if (score >= 80)
    return {
      grade: "A",
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
    };
  if (score >= 70)
    return {
      grade: "B",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
    };
  if (score >= 55)
    return {
      grade: "C",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
    };
  if (score >= 40)
    return {
      grade: "D",
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
    };
  return {
    grade: "F",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  };
}

function getRecommendation(s: Scorecard & { score: number }): {
  icon: any;
  text: string;
  color: string;
} {
  if (s.totalOrders === 0)
    return {
      icon: Package,
      text: "No orders yet — assign products to start tracking performance.",
      color: "text-muted-foreground",
    };
  if (s.cancelledPct > 30)
    return {
      icon: XCircle,
      text: "High cancellation rate — investigate reliability issues before placing more orders.",
      color: "text-red-400",
    };
  if (s.deliveredPct < 40 && s.totalOrders >= 3)
    return {
      icon: AlertTriangle,
      text: "Poor fulfillment rate — consider replacing this supplier.",
      color: "text-orange-400",
    };
  if (s.returnRate > 20)
    return {
      icon: RotateCcw,
      text: "High return rate — review product quality and descriptions.",
      color: "text-yellow-400",
    };
  if (s.margin < 15 && s.totalOrders >= 3)
    return {
      icon: TrendingUp,
      text: "Low margins — renegotiate pricing or find an alternative supplier.",
      color: "text-yellow-400",
    };
  if (s.score >= 80 && s.margin >= 30)
    return {
      icon: Trophy,
      text: "Star performer — consider expanding your product range with this supplier.",
      color: "text-emerald-400",
    };
  if (s.score >= 70)
    return {
      icon: ThumbsUp,
      text: "Solid supplier — maintain the relationship and look for volume discounts.",
      color: "text-green-400",
    };
  return {
    icon: Target,
    text: "Average performance — set improvement targets for fulfillment and margins.",
    color: "text-blue-400",
  };
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Scorecard {
  id: number;
  name: string;
  country: string | null;
  website: string | null;
  totalOrders: number;
  delivered: number;
  cancelled: number;
  pending: number;
  shipped: number;
  placed: number;
  returns: number;
  revenue: number;
  profit: number;
  margin: number;
  deliveredPct: number;
  cancelledPct: number;
  returnRate: number;
  productCount: number;
  topProduct: string | null;
  score: number;
}

// ── Progress bar ───────────────────────────────────────────────────────────
function Bar1({
  value,
  max,
  color = "bg-primary",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Stacked order status bar ───────────────────────────────────────────────
function StatusBar({ s }: { s: Scorecard }) {
  if (s.totalOrders === 0) return null;
  const segs = [
    { count: s.delivered, color: "bg-green-500" },
    { count: s.shipped, color: "bg-purple-500" },
    { count: s.placed, color: "bg-blue-500" },
    { count: s.pending, color: "bg-yellow-500" },
    { count: s.cancelled, color: "bg-red-500" },
  ].filter((x) => x.count > 0);
  return (
    <div className="flex h-2 rounded-full overflow-hidden gap-px mt-2">
      {segs.map((seg, i) => (
        <div
          key={i}
          className={`${seg.color} transition-all`}
          style={{ flex: seg.count }}
          title={`${seg.count} orders`}
        />
      ))}
    </div>
  );
}

// ── Score ring ─────────────────────────────────────────────────────────────
function ScoreRing({
  score,
  grade,
}: {
  score: number;
  grade: ReturnType<typeof getGrade>;
}) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="6"
        />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          strokeWidth="6"
          stroke={
            score >= 80
              ? "#4ade80"
              : score >= 60
                ? "#60a5fa"
                : score >= 40
                  ? "#f59e0b"
                  : "#f87171"
          }
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-black ${grade.color}`}>
          {grade.grade}
        </span>
        <span className="text-[10px] text-muted-foreground">{score}</span>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
type SortKey =
  "score" | "revenue" | "orders" | "delivered" | "profit" | "margin";

export default function Suppliers() {
  const { data: suppliers = [], isLoading: loadingSuppliers } =
    useListSuppliers();
  const { data: allOrders = [] } = useListOrders();
  const { data: allProducts = [] } = useListProducts();
  const { data: allReturns = [] } = useQuery<{ orderId: number }[]>({
    queryKey: ["returns-list"],
    queryFn: () => fetch(`${API}/returns`).then((r) => r.json()),
  });

  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [metric, setMetric] = useState<
    "revenue" | "profit" | "orders" | "margin"
  >("revenue");
  const [compareIds, setCompareIds] = useState<Set<number>>(new Set());
  const [view, setView] = useState<"scorecard" | "compare">("scorecard");

  const returnedOrderIds = useMemo(
    () => new Set(allReturns.map((r) => r.orderId)),
    [allReturns],
  );

  const scorecards: Scorecard[] = useMemo(() => {
    return suppliers.map((supplier) => {
      const supplierProducts = allProducts.filter(
        (p) => p.supplierId === supplier.id,
      );
      const productIds = new Set(supplierProducts.map((p) => p.id));
      const orders = allOrders.filter(
        (o) => o.productId != null && productIds.has(o.productId),
      );

      const totalOrders = orders.length;
      const delivered = orders.filter((o) => o.status === "delivered").length;
      const cancelled = orders.filter((o) => o.status === "cancelled").length;
      const pending = orders.filter((o) => o.status === "pending").length;
      const shipped = orders.filter((o) => o.status === "shipped").length;
      const placed = orders.filter((o) => o.status === "placed").length;
      const returns = orders.filter((o) => returnedOrderIds.has(o.id)).length;

      const revenue = orders.reduce(
        (s, o) => s + Number(o.sellPrice ?? 0) * Number(o.quantity ?? 1),
        0,
      );
      const cogs = orders.reduce(
        (s, o) => s + Number(o.costPrice ?? 0) * Number(o.quantity ?? 1),
        0,
      );
      const profit = revenue - cogs;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      const deliveredPct =
        totalOrders > 0 ? (delivered / totalOrders) * 100 : 0;
      const cancelledPct =
        totalOrders > 0 ? (cancelled / totalOrders) * 100 : 0;
      const returnRate = delivered > 0 ? (returns / delivered) * 100 : 0;

      const productRevMap: Record<number, number> = {};
      for (const o of orders) {
        if (o.productId != null)
          productRevMap[o.productId] =
            (productRevMap[o.productId] ?? 0) +
            Number(o.sellPrice ?? 0) * Number(o.quantity ?? 1);
      }
      const topProductId = Object.entries(productRevMap).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0];
      const topProduct =
        allProducts.find((p) => p.id === Number(topProductId))?.name ?? null;

      const base: Scorecard = {
        id: supplier.id,
        name: supplier.name,
        country: supplier.country ?? null,
        website: supplier.website ?? null,
        totalOrders,
        delivered,
        cancelled,
        pending,
        shipped,
        placed,
        returns,
        revenue,
        profit,
        margin,
        deliveredPct,
        cancelledPct,
        returnRate,
        productCount: supplierProducts.length,
        topProduct,
        score: 0,
      };
      return { ...base, score: calcScore(base) };
    });
  }, [suppliers, allOrders, allProducts, returnedOrderIds]);

  const sorted = useMemo(
    () =>
      [...scorecards].sort((a, b) => {
        if (sortBy === "score") return b.score - a.score;
        if (sortBy === "revenue") return b.revenue - a.revenue;
        if (sortBy === "orders") return b.totalOrders - a.totalOrders;
        if (sortBy === "delivered") return b.deliveredPct - a.deliveredPct;
        if (sortBy === "profit") return b.profit - a.profit;
        if (sortBy === "margin") return b.margin - a.margin;
        return 0;
      }),
    [scorecards, sortBy],
  );

  const chartData = [...scorecards]
    .sort((a, b) =>
      metric === "orders"
        ? b.totalOrders - a.totalOrders
        : metric === "profit"
          ? b.profit - a.profit
          : metric === "margin"
            ? b.margin - a.margin
            : b.revenue - a.revenue,
    )
    .map((s) => ({
      name: s.name.length > 12 ? s.name.slice(0, 11) + "…" : s.name,
      value:
        metric === "orders"
          ? s.totalOrders
          : metric === "profit"
            ? s.profit
            : metric === "margin"
              ? s.margin
              : s.revenue,
    }));

  const totalRevenue = scorecards.reduce((s, c) => s + c.revenue, 0);
  const totalOrders = scorecards.reduce((s, c) => s + c.totalOrders, 0);
  const avgDelivered =
    scorecards.length > 0
      ? scorecards.reduce((s, c) => s + c.deliveredPct, 0) / scorecards.length
      : 0;
  const avgScore =
    scorecards.length > 0
      ? scorecards.reduce((s, c) => s + c.score, 0) / scorecards.length
      : 0;
  const topSupplier = [...scorecards].sort((a, b) => b.score - a.score)[0];

  const SORTS: { key: SortKey; label: string }[] = [
    { key: "score", label: "Score" },
    { key: "revenue", label: "Revenue" },
    { key: "profit", label: "Profit" },
    { key: "orders", label: "Orders" },
    { key: "delivered", label: "Fulfillment" },
    { key: "margin", label: "Margin" },
  ];
  const METRICS: { key: typeof metric; label: string }[] = [
    { key: "revenue", label: "Revenue" },
    { key: "profit", label: "Profit" },
    { key: "orders", label: "Orders" },
    { key: "margin", label: "Margin %" },
  ];

  // Compare mode radar data
  const compareList = scorecards.filter((s) => compareIds.has(s.id));
  const radarData = [
    {
      metric: "Fulfillment",
      ...Object.fromEntries(compareList.map((s) => [s.name, s.deliveredPct])),
    },
    {
      metric: "Margin",
      ...Object.fromEntries(
        compareList.map((s) => [s.name, Math.min(s.margin, 100)]),
      ),
    },
    {
      metric: "No Cancels",
      ...Object.fromEntries(
        compareList.map((s) => [s.name, Math.max(0, 100 - s.cancelledPct)]),
      ),
    },
    {
      metric: "Volume",
      ...Object.fromEntries(
        compareList.map((s) => [s.name, Math.min(s.totalOrders * 5, 100)]),
      ),
    },
    {
      metric: "No Returns",
      ...Object.fromEntries(
        compareList.map((s) => [s.name, Math.max(0, 100 - s.returnRate)]),
      ),
    },
  ];
  const COMPARE_COLORS = ["#818cf8", "#4ade80", "#f59e0b", "#f87171"];

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  };

  if (loadingSuppliers)
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Supplier Performance Scorecard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Composite rankings across fulfillment, margins, volume, and
            reliability.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "scorecard" ? "default" : "outline"}
            onClick={() => setView("scorecard")}
          >
            <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
            Scorecard
          </Button>
          <Button
            size="sm"
            variant={view === "compare" ? "default" : "outline"}
            onClick={() => setView("compare")}
            disabled={compareIds.size < 2}
          >
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Compare {compareIds.size > 0 ? `(${compareIds.size})` : ""}
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Suppliers",
            value: suppliers.length,
            color: "",
            Icon: Truck,
          },
          {
            label: "Total Revenue",
            value: fmt(totalRevenue),
            color: "text-primary",
            Icon: TrendingUp,
          },
          {
            label: "Avg Fulfillment",
            value: `${avgDelivered.toFixed(0)}%`,
            color: avgDelivered >= 70 ? "text-green-400" : "text-yellow-400",
            Icon: CheckCircle,
          },
          {
            label: "Avg Score",
            value: `${avgScore.toFixed(0)}/100`,
            color: avgScore >= 70 ? "text-green-400" : "text-yellow-400",
            Icon: Star,
          },
          {
            label: "Top Performer",
            value: topSupplier?.name ?? "—",
            color: "text-yellow-400 truncate",
            Icon: Trophy,
          },
        ].map(({ label, value, color, Icon }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {label}
              </div>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compare mode — radar chart */}
      {view === "compare" && compareIds.size >= 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Head-to-Head Comparison
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              5-axis radar across fulfillment, margin, cancellations, volume,
              and returns. Larger area = better.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: "#6b7280" }}
                  />
                  {compareList.map((s, i) => (
                    <Radar
                      key={s.id}
                      name={s.name}
                      dataKey={s.name}
                      stroke={COMPARE_COLORS[i]}
                      fill={COMPARE_COLORS[i]}
                      fillOpacity={0.15}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {/* Side-by-side metric table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">
                      Metric
                    </th>
                    {compareList.map((s, i) => (
                      <th
                        key={s.id}
                        className="text-right py-2 font-medium"
                        style={{ color: COMPARE_COLORS[i] }}
                      >
                        {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {[
                    { label: "Score", fn: (s: Scorecard) => `${s.score}/100` },
                    {
                      label: "Grade",
                      fn: (s: Scorecard) => getGrade(s.score).grade,
                    },
                    {
                      label: "Fulfillment Rate",
                      fn: (s: Scorecard) =>
                        s.totalOrders > 0
                          ? `${s.deliveredPct.toFixed(0)}%`
                          : "—",
                    },
                    {
                      label: "Avg Margin",
                      fn: (s: Scorecard) =>
                        s.totalOrders > 0 ? `${s.margin.toFixed(1)}%` : "—",
                    },
                    {
                      label: "Cancel Rate",
                      fn: (s: Scorecard) =>
                        s.totalOrders > 0
                          ? `${s.cancelledPct.toFixed(0)}%`
                          : "—",
                    },
                    {
                      label: "Return Rate",
                      fn: (s: Scorecard) =>
                        s.delivered > 0 ? `${s.returnRate.toFixed(0)}%` : "—",
                    },
                    {
                      label: "Total Revenue",
                      fn: (s: Scorecard) =>
                        s.revenue > 0 ? fmt(s.revenue) : "—",
                    },
                    {
                      label: "Total Profit",
                      fn: (s: Scorecard) =>
                        s.profit > 0 ? fmt(s.profit) : "—",
                    },
                    {
                      label: "Order Volume",
                      fn: (s: Scorecard) => String(s.totalOrders),
                    },
                  ].map((row) => (
                    <tr key={row.label}>
                      <td className="py-2 text-muted-foreground">
                        {row.label}
                      </td>
                      {compareList.map((s) => (
                        <td key={s.id} className="py-2 text-right font-medium">
                          {row.fn(s)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bar chart */}
      {view === "scorecard" && totalOrders > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-primary" />
                Supplier Comparison
              </CardTitle>
              <div className="flex gap-1">
                {METRICS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${metric === m.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tickFormatter={(v) =>
                      metric === "orders"
                        ? String(v)
                        : metric === "margin"
                          ? `${v.toFixed(0)}%`
                          : `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                    formatter={(v: number) => [
                      metric === "orders"
                        ? v
                        : metric === "margin"
                          ? `${v.toFixed(1)}%`
                          : fmt(v),
                      METRICS.find((m) => m.key === metric)?.label ?? "",
                    ]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          [
                            "#818cf8",
                            "#4ade80",
                            "#f59e0b",
                            "#f87171",
                            "#a78bfa",
                          ][i % 5]
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

      {/* Ranked scorecards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            All Suppliers
          </h2>
          <div className="flex items-center gap-3">
            {view === "scorecard" && (
              <p className="text-xs text-muted-foreground">
                Select up to 4 to compare →
              </p>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpDown className="w-3 h-3" />
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSortBy(s.key)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${sortBy === s.key ? "bg-primary/20 text-primary font-medium" : "hover:text-foreground"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {sorted.map((s, rank) => {
          const grade = getGrade(s.score);
          const rec = getRecommendation(s);
          const RecIcon = rec.icon;
          const isSelected = compareIds.has(s.id);
          const maxRevenue = Math.max(...scorecards.map((c) => c.revenue), 1);
          const maxOrders = Math.max(
            ...scorecards.map((c) => c.totalOrders),
            1,
          );

          return (
            <div
              key={s.id}
              className={`rounded-xl border transition-all ${isSelected ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="p-4 flex items-start gap-4">
                {/* Score ring */}
                <ScoreRing score={s.score} grade={grade} />

                {/* Body */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Name row */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            rank === 0
                              ? "bg-yellow-500/20 text-yellow-400"
                              : rank === 1
                                ? "bg-slate-400/20 text-slate-300"
                                : rank === 2
                                  ? "bg-orange-500/20 text-orange-400"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {rank + 1}
                        </span>
                        <Link
                          href={`/suppliers/${s.id}`}
                          className="font-bold text-base hover:text-primary transition-colors flex items-center gap-1"
                        >
                          {s.name}
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </Link>
                        {s.country && (
                          <span className="text-xs text-muted-foreground">
                            {s.country}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {s.productCount} product
                          {s.productCount !== 1 ? "s" : ""}
                        </Badge>
                        {s.deliveredPct >= 85 && s.totalOrders >= 3 && (
                          <Badge className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1">
                            <Zap className="w-2.5 h-2.5" />
                            Top performer
                          </Badge>
                        )}
                        {s.cancelledPct > 25 && s.totalOrders >= 3 && (
                          <Badge className="text-xs bg-red-500/10 text-red-400 border-red-500/20 gap-1">
                            <XCircle className="w-2.5 h-2.5" />
                            High cancels
                          </Badge>
                        )}
                        {s.returnRate > 15 && (
                          <Badge className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/20 gap-1">
                            <RotateCcw className="w-2.5 h-2.5" />
                            High returns
                          </Badge>
                        )}
                      </div>
                      {s.topProduct && (
                        <p className="text-xs text-muted-foreground mt-0.5 ml-7">
                          Top product:{" "}
                          <span className="text-foreground">
                            {s.topProduct}
                          </span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleCompare(s.id)}
                      className={`text-xs px-3 py-1 rounded-md border font-medium transition-colors ${isSelected ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
                    >
                      {isSelected ? "✓ Selected" : "Compare"}
                    </button>
                  </div>

                  {/* 4-metric grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                          Fulfillment
                        </span>
                        <span
                          className={`font-semibold ${s.deliveredPct >= 70 ? "text-green-400" : s.deliveredPct >= 40 ? "text-yellow-400" : "text-red-400"}`}
                        >
                          {s.totalOrders > 0
                            ? `${s.deliveredPct.toFixed(0)}%`
                            : "—"}
                        </span>
                      </div>
                      <Bar1
                        value={s.deliveredPct}
                        max={100}
                        color={
                          s.deliveredPct >= 70
                            ? "bg-green-500"
                            : s.deliveredPct >= 40
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                          Avg Margin
                        </span>
                        <span
                          className={`font-semibold ${s.margin >= 30 ? "text-green-400" : s.margin >= 15 ? "text-yellow-400" : "text-red-400"}`}
                        >
                          {s.totalOrders > 0 ? `${s.margin.toFixed(1)}%` : "—"}
                        </span>
                      </div>
                      <Bar1
                        value={s.margin}
                        max={60}
                        color={
                          s.margin >= 30
                            ? "bg-green-500"
                            : s.margin >= 15
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Revenue</span>
                        <span className="font-semibold">
                          {s.revenue > 0 ? fmt(s.revenue) : "—"}
                        </span>
                      </div>
                      <Bar1
                        value={s.revenue}
                        max={maxRevenue}
                        color="bg-primary"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                          Order Volume
                        </span>
                        <span className="font-semibold">{s.totalOrders}</span>
                      </div>
                      <Bar1
                        value={s.totalOrders}
                        max={maxOrders}
                        color="bg-blue-500"
                      />
                    </div>
                  </div>

                  {/* Status stacked bar */}
                  <StatusBar s={s} />
                  {s.totalOrders > 0 && (
                    <div className="flex gap-3 text-[10px] text-muted-foreground flex-wrap">
                      {s.delivered > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          {s.delivered} delivered
                        </span>
                      )}
                      {s.shipped > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
                          {s.shipped} shipped
                        </span>
                      )}
                      {s.placed > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                          {s.placed} placed
                        </span>
                      )}
                      {s.pending > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                          {s.pending} pending
                        </span>
                      )}
                      {s.cancelled > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                          {s.cancelled} cancelled
                        </span>
                      )}
                      {s.returns > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
                          {s.returns} returned
                        </span>
                      )}
                    </div>
                  )}

                  {/* AI-style recommendation */}
                  <div
                    className={`flex items-start gap-2 text-xs rounded-md px-3 py-2 border ${
                      rec.color === "text-emerald-400"
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : rec.color === "text-green-400"
                          ? "bg-green-500/5 border-green-500/20"
                          : rec.color === "text-yellow-400"
                            ? "bg-yellow-500/5 border-yellow-500/20"
                            : rec.color === "text-orange-400"
                              ? "bg-orange-500/5 border-orange-500/20"
                              : rec.color === "text-red-400"
                                ? "bg-red-500/5 border-red-500/20"
                                : "bg-muted/50 border-border"
                    }`}
                  >
                    <RecIcon
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${rec.color}`}
                    />
                    <span className="text-muted-foreground leading-relaxed">
                      {rec.text}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl border-border">
            <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No suppliers yet</p>
            <p className="text-sm mt-1">
              Add suppliers and assign products to see performance rankings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
