import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
function fmtFull(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export default function CashFlowPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["cash-flow-forecast"],
    queryFn: () =>
      fetch(`${BASE}/api/cash-flow/forecast`).then((r) => r.json()),
  });

  const summary = data?.summary ?? {};
  const timeline = data?.cashFlowTimeline ?? [];
  const platforms = Object.values(data?.platformBreakdown ?? {}) as {
    spend: number;
    revenue: number;
  }[];

  const STAT_CARDS = [
    {
      label: "Net Cash Position",
      value: fmt(summary.netCashPosition ?? 0),
      icon: Wallet,
      color:
        (summary.netCashPosition ?? 0) >= 0
          ? "text-emerald-400"
          : "text-red-400",
      sub: "Revenue minus all costs",
    },
    {
      label: "Pending Inflows",
      value: fmt(summary.pendingRevenue ?? 0),
      icon: TrendingUp,
      color: "text-blue-400",
      sub: "Active orders not yet cleared",
    },
    {
      label: "Pending Outflows",
      value: fmt(summary.pendingCosts ?? 0),
      icon: TrendingDown,
      color: "text-orange-400",
      sub: "Open purchase orders due",
    },
    {
      label: "30-Day Net Projection",
      value: fmt(summary.projectedNet30 ?? 0),
      icon: Clock,
      color:
        (summary.projectedNet30 ?? 0) >= 0
          ? "text-emerald-400"
          : "text-red-400",
      sub: "Inflows minus outflows ahead",
    },
    {
      label: "Total Revenue",
      value: fmt(summary.totalRevenue ?? 0),
      icon: DollarSign,
      color: "text-emerald-400",
      sub: "All-time delivered orders",
    },
    {
      label: "Active Ad Spend",
      value: fmt(summary.activeAdSpend ?? 0),
      icon: AlertCircle,
      color: "text-purple-400",
      sub: "Running ad campaigns total",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cash Flow Forecast</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Rolling financial position — inflows, outflows, and 30/60/90-day
          projection
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {STAT_CARDS.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      {s.label}
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                      {s.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {s.sub}
                    </p>
                  </div>
                  <s.icon className={`w-5 h-5 mt-0.5 ${s.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              6-Month Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-52 bg-muted animate-pulse rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="inflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="outflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#71717a" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#71717a" }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: 8,
                    }}
                    formatter={(v: any) => fmtFull(Number(v))}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="inflow"
                    name="Inflow"
                    stroke="#34d399"
                    fill="url(#inflow)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="outflow"
                    name="Outflow"
                    stroke="#f87171"
                    fill="url(#outflow)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Monthly Net Cash
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-52 bg-muted animate-pulse rounded" />
            ) : timeline.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                No data yet — add orders and purchase orders to see cash flow
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#71717a" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#71717a" }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: 8,
                    }}
                    formatter={(v: any) => fmtFull(Number(v))}
                  />
                  <Bar
                    dataKey="net"
                    name="Net"
                    radius={[4, 4, 0, 0]}
                    fill="#6366f1"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Cash Flow Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Gross Profit Margin
              </p>
              <p className="text-xl font-bold text-emerald-400">
                {summary.totalRevenue > 0
                  ? `${(((summary.totalRevenue - summary.totalCogs) / summary.totalRevenue) * 100).toFixed(1)}%`
                  : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total COGS</p>
              <p className="text-xl font-bold text-orange-400">
                {fmt(summary.totalCogs ?? 0)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Profit</p>
              <p
                className={`text-xl font-bold ${(summary.totalProfit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {fmt(summary.totalProfit ?? 0)}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              Forecast Advice
            </p>
            <div className="space-y-1.5">
              {(summary.projectedNet30 ?? 0) < 0 && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>
                    Negative 30-day projection — delay non-urgent purchase
                    orders or increase order volume
                  </span>
                </div>
              )}
              {(summary.pendingCosts ?? 0) > (summary.pendingRevenue ?? 0) && (
                <div className="flex items-center gap-2 text-sm text-orange-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>
                    Outflows exceed inflows — monitor supplier payment timing
                    closely
                  </span>
                </div>
              )}
              {(summary.netCashPosition ?? 0) >= 0 &&
                (summary.projectedNet30 ?? 0) >= 0 && (
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>
                      Cash position is healthy — consider scaling ad spend or
                      sourcing new products
                    </span>
                  </div>
                )}
              {(summary.activeAdSpend ?? 0) >
                (summary.totalRevenue ?? 0) * 0.3 && (
                <div className="flex items-center gap-2 text-sm text-orange-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>
                    Ad spend exceeds 30% of revenue — review campaign ROAS in Ad
                    Spend tracker
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
