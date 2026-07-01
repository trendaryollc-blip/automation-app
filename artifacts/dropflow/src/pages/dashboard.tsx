import { useState, useEffect, useMemo } from "react";
import {
  useGetDashboardStats,
  useGetRecentOrders,
  useGetTrendingProducts,
  useHealthCheck,
  useGetDashboardAnalytics,
  useGetStockAlerts,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  DollarSign,
  BarChart3,
  AlertTriangle,
  X,
  Bell,
  Zap,
  Target,
  Flame,
  Users,
  Sparkles,
  BrainCircuit,
  Gauge,
  Trophy,
  Rocket,
  Star,
  ChevronRight,
  Percent,
  CircleDot,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

/* ─── Animated Counter Hook ─── */
function useAnimatedNumber(value: number | undefined, duration = 1200) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === undefined) return;
    const start = display;
    const diff = value - start;
    if (Math.abs(diff) < 0.01) {
      setDisplay(value);
      return;
    }
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(start + diff * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return display;
}

/* ─── Mini Sparkline Component ─── */
function Sparkline({
  data,
  color,
  height = 32,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  const chartData = data.map((v, i) => ({ x: i, y: v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient
            id={`spark-${color.replace("#", "")}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="y"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color.replace("#", "")})`}
          dot={false}
          isAnimationActive={true}
          animationDuration={1500}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ─── Gauge Component ─── */
function SalesVelocityGauge({
  value,
  max = 100,
}: {
  value: number;
  max?: number;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const gaugeData = [
    {
      name: "velocity",
      value: percentage,
      fill:
        percentage > 70 ? "#10B981" : percentage > 40 ? "#3B82F6" : "#EF4444",
    },
  ];
  return (
    <div className="relative flex items-center justify-center">
      <ResponsiveContainer width={120} height={80}>
        <RadialBarChart
          cx="50%"
          cy="100%"
          innerRadius="70%"
          outerRadius="100%"
          startAngle={180}
          endAngle={0}
          data={gaugeData}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={4}
            background={{ fill: "rgba(255,255,255,0.05)" }}
            isAnimationActive={true}
            animationDuration={1500}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute bottom-1 text-center">
        <span className="text-lg font-bold">{value}</span>
        <span className="text-xs text-muted-foreground ml-0.5">/min</span>
      </div>
    </div>
  );
}

/* ─── Virality Score Bar ─── */
function ViralityBar({ score, label }: { score: number; label: string }) {
  const getColor = (s: number) => {
    if (s >= 80)
      return {
        bar: "bg-gradient-to-r from-emerald-500 to-cyan-400",
        glow: "shadow-[0_0_12px_rgba(16,185,129,0.3)]",
      };
    if (s >= 60)
      return {
        bar: "bg-gradient-to-r from-blue-500 to-violet-500",
        glow: "shadow-[0_0_12px_rgba(59,130,246,0.3)]",
      };
    if (s >= 40)
      return {
        bar: "bg-gradient-to-r from-amber-500 to-orange-500",
        glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]",
      };
    return {
      bar: "bg-gradient-to-r from-red-500 to-rose-500",
      glow: "shadow-[0_0_12px_rgba(239,68,68,0.3)]",
    };
  };
  const colors = getColor(score);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{score}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full ${colors.bar} ${colors.glow} transition-all duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Goal Progress Component ─── */
function GoalProgress({
  current,
  target,
  label,
  icon,
}: {
  current: number;
  target: number;
  label: string;
  icon: React.ReactNode;
}) {
  const percentage = Math.min((current / target) * 100, 100);
  const isComplete = percentage >= 100;
  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-300 ${isComplete ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/5 bg-white/[0.02]"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg ${isComplete ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-muted-foreground"}`}
          >
            {icon}
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        {isComplete && (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
            <Trophy className="w-3 h-3 mr-1" /> Complete!
          </Badge>
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xl font-bold">${current.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">
          / ${target.toLocaleString()}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${
            isComplete
              ? "bg-gradient-to-r from-emerald-500 to-cyan-400 animate-shimmer"
              : "bg-gradient-to-r from-blue-500 to-violet-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        {percentage.toFixed(0)}% achieved
      </p>
    </div>
  );
}

/* ─── MAIN DASHBOARD COMPONENT ─── */
export default function Dashboard() {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: analytics, isLoading: analyticsLoading } =
    useGetDashboardAnalytics({ period });
  const { data: recentOrders, isLoading: ordersLoading } = useGetRecentOrders();
  const { data: trendingProducts, isLoading: trendingLoading } =
    useGetTrendingProducts();
  const { data: health } = useHealthCheck();
  const { data: stockAlerts = [] } = useGetStockAlerts();

  // Animated KPI values
  const animatedRevenue = useAnimatedNumber(stats?.totalRevenue);
  const animatedProfit = useAnimatedNumber(stats?.totalProfit);
  const animatedOrders = useAnimatedNumber(stats?.pendingOrders);
  const animatedMargin = useAnimatedNumber(stats?.avgMargin);

  // Mock sparkline data (would be replaced with real historical data)
  const revenueSparkline = useMemo(
    () =>
      Array.from(
        { length: 14 },
        (_, i) => 2000 + Math.random() * 3000 + i * 200,
      ),
    [],
  );
  const profitSparkline = useMemo(
    () =>
      Array.from(
        { length: 14 },
        (_, i) => 500 + Math.random() * 1500 + i * 100,
      ),
    [],
  );
  const ordersSparkline = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => 5 + Math.floor(Math.random() * 15)),
    [],
  );
  const marginSparkline = useMemo(
    () => Array.from({ length: 14 }, (_, i) => 20 + Math.random() * 15),
    [],
  );

  // Traffic data for bottom charts
  const trafficData = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
        visits: 120 + Math.floor(Math.random() * 300),
        conversions: 8 + Math.floor(Math.random() * 25),
      })),
    [],
  );

  if (statsLoading || ordersLoading || trendingLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20"></div>
            <div
              className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary absolute inset-0"
              style={{
                animationDirection: "reverse",
                animationDuration: "0.8s",
              }}
            ></div>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading War Room...
          </p>
        </div>
      </div>
    );

  const isOperational = health?.status === "ok";

  const kpiCards = [
    {
      title: "Total Revenue",
      value: `$${animatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <DollarSign className="h-5 w-5" />,
      trend: analytics?.revenueChange,
      sparkline: revenueSparkline,
      sparkColor: "#3B82F6",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
      glowClass: "neon-glow-blue",
      tooltip: "Total revenue across all channels this period",
    },
    {
      title: "Net Profit",
      value: `$${animatedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <TrendingUp className="h-5 w-5" />,
      trend: analytics?.profitChange,
      sparkline: profitSparkline,
      sparkColor: "#10B981",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      glowClass: "neon-glow-green",
      tooltip: "Net profit after all expenses and fees",
    },
    {
      title: "Active Orders",
      value: animatedOrders.toFixed(0),
      subtitle: `/ ${(stats?.totalOrders ?? 0).toLocaleString()} total`,
      icon: <ShoppingCart className="h-5 w-5" />,
      trend: analytics?.ordersChange,
      sparkline: ordersSparkline,
      sparkColor: "#8B5CF6",
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-400",
      glowClass: "neon-glow-purple",
      tooltip: "Orders currently being processed or shipped",
    },
    {
      title: "Avg Margin",
      value: `${animatedMargin.toFixed(1)}%`,
      icon: <Percent className="h-5 w-5" />,
      sparkline: marginSparkline,
      sparkColor: "#22D3EE",
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-400",
      glowClass: "neon-glow-cyan",
      tooltip: "Average profit margin across all products",
    },
  ];

  // Profit source breakdown for pie chart
  const profitSources = [
    { name: "Organic", value: 42, color: "#3B82F6" },
    { name: "Paid Ads", value: 28, color: "#8B5CF6" },
    { name: "Influencer", value: 18, color: "#22D3EE" },
    { name: "Referral", value: 12, color: "#10B981" },
  ];

  // Virality scores for trending products
  const viralityScores =
    trendingProducts?.map((p, i) => ({
      ...p,
      viralityScore: [87, 72, 65, 58, 45][i] ?? 40,
      velocity: [92, 78, 61, 55, 48][i] ?? 35,
    })) ?? [];

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in-up">
        {/* ═══════════ TOP BAR ═══════════ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="gradient-text">War Room</span>
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isOperational ? "bg-emerald-400" : "bg-red-400"} opacity-75`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${isOperational ? "bg-emerald-500" : "bg-red-500"}`}
                  ></span>
                </span>
                <span>System Status:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${isOperational ? "status-operational" : "status-degraded"}`}
                >
                  <CircleDot className="w-3 h-3" />
                  {isOperational
                    ? "All Systems Operational"
                    : "Degraded Performance"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="relative p-2.5 rounded-xl glass hover:bg-white/5 transition-all duration-200 group">
                  <Bell className="h-5 w-5 text-muted-foreground group:text-foreground transition-colors" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white items-center justify-center font-bold">
                      3
                    </span>
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>3 new notifications</p>
              </TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl glass">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                D
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">DropFlow</p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ GRADIENT ACCENT BAR ═══════════ */}
        <div className="h-px gradient-accent-bar opacity-30 rounded-full" />

        {/* ═══════════ STOCK ALERTS ═══════════ */}
        {stockAlerts.length > 0 && !alertsDismissed && (
          <div className="rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500/5 via-orange-500/10 to-red-500/5 px-5 py-4 glass-light animate-fade-in-up">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-orange-500/10 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-orange-300">
                    {stockAlerts.length} product
                    {stockAlerts.length !== 1 ? "s" : ""} running low on stock
                  </p>
                  <p className="text-xs text-orange-400/60 mt-0.5">
                    Immediate restocking recommended
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {stockAlerts.map((a) => (
                      <Link key={a.id} href={`/products/${a.id}`}>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-orange-500/10 text-orange-300 border border-orange-500/15 hover:bg-orange-500/20 hover:border-orange-500/30 transition-all cursor-pointer">
                          {a.name}
                          <span className="font-mono font-bold text-orange-200">
                            {a.stockQuantity}
                          </span>
                          <span className="text-orange-400/40">
                            / {a.stockThreshold}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setAlertsDismissed(true)}
                className="shrink-0 p-1 rounded-lg text-orange-400/40 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ HERO KPI CARDS ═══════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi, index) => (
            <Tooltip key={kpi.title}>
              <TooltipTrigger asChild>
                <Card
                  className={`kpi-card glass gradient-border cursor-default opacity-0 animate-fade-in-up`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={`p-2.5 rounded-xl ${kpi.iconBg} ${kpi.iconColor}`}
                      >
                        {kpi.icon}
                      </div>
                      {kpi.trend !== undefined && kpi.trend !== null && (
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            kpi.trend >= 0
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {kpi.trend >= 0 ? (
                            <ArrowUpRight className="w-3 h-3 animate-bounce-subtle" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {Math.abs(kpi.trend).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                        {kpi.title}
                      </p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold tracking-tight">
                          {kpi.value}
                        </span>
                        {kpi.subtitle && (
                          <span className="text-sm text-muted-foreground">
                            {kpi.subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 -mx-1">
                      <Sparkline
                        data={kpi.sparkline}
                        color={kpi.sparkColor}
                        height={36}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>{kpi.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* ═══════════ REVENUE & ANALYTICS ═══════════ */}
        <Card className="glass gradient-border col-span-full animate-fade-in-up animation-delay-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <CardTitle className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <span className="text-base">Revenue & Analytics</span>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  Performance overview across all channels
                </p>
              </div>
            </CardTitle>
            <div className="flex items-center gap-1 p-1 rounded-xl glass">
              {(["weekly", "monthly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 text-sm rounded-lg transition-all duration-200 font-medium ${
                    period === p
                      ? "bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white shadow-sm border border-blue-500/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[300px]">
                <Skeleton className="h-full w-full rounded-xl" />
                <Skeleton className="h-full w-full rounded-xl" />
                <Skeleton className="h-full w-full rounded-xl" />
              </div>
            ) : analytics ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue & Profit Chart */}
                <div className="h-[300px] flex flex-col">
                  <h3 className="text-sm font-medium mb-4 text-muted-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    Revenue & Profit
                  </h3>
                  <div className="flex-1 rounded-xl chart-gradient-blue">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={analytics.data}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorRevenueNew"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3B82F6"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3B82F6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorProfitNew"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10B981"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10B981"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="rgba(255,255,255,0.04)"
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => {
                            if (!value) return "";
                            try {
                              const d = new Date(value);
                              return period === "weekly"
                                ? format(d, "EEE")
                                : format(d, "MMM");
                            } catch (e) {
                              return value;
                            }
                          }}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tickFormatter={(value) =>
                            `$${value >= 1000 ? (value / 1000).toFixed(0) + "k" : value}`
                          }
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "rgba(15, 15, 20, 0.9)",
                            backdropFilter: "blur(12px)",
                            borderColor: "rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                            padding: "12px 16px",
                          }}
                          itemStyle={{ color: "#fff", fontSize: "13px" }}
                          labelStyle={{
                            color: "rgba(255,255,255,0.5)",
                            marginBottom: "6px",
                            fontSize: "11px",
                          }}
                          formatter={(value: number, name: string) => {
                            if (name === "Revenue" || name === "Profit")
                              return [`$${value.toLocaleString()}`, name];
                            return [value, name];
                          }}
                          labelFormatter={(label: any) => {
                            if (!label) return "";
                            try {
                              return format(
                                new Date(label),
                                period === "weekly"
                                  ? "MMM d, yyyy"
                                  : "MMMM yyyy",
                              );
                            } catch (e) {
                              return label;
                            }
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#3B82F6"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorRevenueNew)"
                          name="Revenue"
                          dot={false}
                          activeDot={{
                            r: 5,
                            stroke: "#3B82F6",
                            strokeWidth: 2,
                            fill: "#0E0E10",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="profit"
                          stroke="#10B981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorProfitNew)"
                          name="Profit"
                          dot={false}
                          activeDot={{
                            r: 5,
                            stroke: "#10B981",
                            strokeWidth: 2,
                            fill: "#0E0E10",
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Order Volume Chart */}
                <div className="h-[300px] flex flex-col">
                  <h3 className="text-sm font-medium mb-4 text-muted-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-violet-500"></span>
                    Order Volume
                  </h3>
                  <div className="flex-1 rounded-xl chart-gradient-purple">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.data}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="rgba(255,255,255,0.04)"
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => {
                            if (!value) return "";
                            try {
                              const d = new Date(value);
                              return period === "weekly"
                                ? format(d, "EEE")
                                : format(d, "MMM");
                            } catch (e) {
                              return value;
                            }
                          }}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "rgba(15, 15, 20, 0.9)",
                            backdropFilter: "blur(12px)",
                            borderColor: "rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                            padding: "12px 16px",
                          }}
                          itemStyle={{ color: "#fff", fontSize: "13px" }}
                          labelStyle={{
                            color: "rgba(255,255,255,0.5)",
                            marginBottom: "6px",
                            fontSize: "11px",
                          }}
                          cursor={{
                            fill: "rgba(139, 92, 246, 0.08)",
                            radius: 4,
                          }}
                          labelFormatter={(label: any) => {
                            if (!label) return "";
                            try {
                              return format(
                                new Date(label),
                                period === "weekly"
                                  ? "MMM d, yyyy"
                                  : "MMMM yyyy",
                              );
                            } catch (e) {
                              return label;
                            }
                          }}
                        />
                        <Bar
                          dataKey="orderCount"
                          fill="url(#barGradient)"
                          radius={[6, 6, 0, 0]}
                          name="Orders"
                        />
                        <defs>
                          <linearGradient
                            id="barGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#8B5CF6"
                              stopOpacity={0.9}
                            />
                            <stop
                              offset="100%"
                              stopColor="#6D28D9"
                              stopOpacity={0.6}
                            />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Period Summary Panel */}
                <div className="h-[300px] flex flex-col">
                  <h3 className="text-sm font-medium mb-4 text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Period Summary
                  </h3>
                  <div className="flex-1 glass rounded-xl p-5 flex flex-col justify-between">
                    {[
                      {
                        label: "Total Revenue",
                        value: `$${analytics.totalRevenue.toLocaleString()}`,
                        change: analytics.revenueChange,
                        color: "blue",
                      },
                      {
                        label: "Total Profit",
                        value: `$${analytics.totalProfit.toLocaleString()}`,
                        change: analytics.profitChange,
                        color: "emerald",
                      },
                      {
                        label: "Total Orders",
                        value: analytics.totalOrders.toLocaleString(),
                        change: analytics.ordersChange,
                        color: "violet",
                      },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          {item.label}
                        </p>
                        <div className="flex items-baseline gap-3">
                          <h4
                            className={`text-2xl font-bold tracking-tight ${item.color === "emerald" ? "text-emerald-400" : ""}`}
                          >
                            {item.value}
                          </h4>
                          <span
                            className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                              item.change >= 0
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {item.change >= 0 ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {item.change > 0 ? "+" : ""}
                            {item.change.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-muted-foreground">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm">No analytics data available</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══════════ AI INTELLIGENCE PANELS ═══════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sales Velocity */}
          <Card className="glass gradient-border animate-fade-in-up animation-delay-300">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Gauge className="h-4 w-4 text-cyan-400" />
                </div>
                <span className="text-sm font-medium">Sales Velocity</span>
              </div>
              <SalesVelocityGauge value={73} max={100} />
              <p className="text-xs text-muted-foreground text-center mt-2">
                orders per minute
              </p>
            </CardContent>
          </Card>

          {/* Revenue Forecast */}
          <Card className="glass gradient-border animate-fade-in-up animation-delay-300">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <BrainCircuit className="h-4 w-4 text-violet-400" />
                </div>
                <span className="text-sm font-medium">AI Forecast</span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Next Week Revenue
                  </p>
                  <p className="text-2xl font-bold gradient-text">$4,280</p>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
                  <Rocket className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">
                    +12% predicted growth
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profit Source Breakdown */}
          <Card className="glass gradient-border animate-fade-in-up animation-delay-400">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Target className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-sm font-medium">Profit Sources</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={profitSources}
                        cx="50%"
                        cy="50%"
                        innerRadius={18}
                        outerRadius={30}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {profitSources.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {profitSources.map((source) => (
                    <div
                      key={source.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: source.color }}
                        ></span>
                        <span className="text-muted-foreground">
                          {source.name}
                        </span>
                      </div>
                      <span className="font-mono font-medium">
                        {source.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Smart Alerts */}
          <Card className="glass gradient-border animate-fade-in-up animation-delay-400">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Zap className="h-4 w-4 text-amber-400" />
                </div>
                <span className="text-sm font-medium">Smart Alerts</span>
              </div>
              <div className="space-y-2.5">
                {[
                  {
                    icon: <Flame className="w-3.5 h-3.5" />,
                    text: "Trending: LED Strip Lights +340%",
                    color: "text-orange-400 bg-orange-500/10",
                  },
                  {
                    icon: <TrendingDown className="w-3.5 h-3.5" />,
                    text: "Margin drop on Phone Cases",
                    color: "text-red-400 bg-red-500/10",
                  },
                  {
                    icon: <Star className="w-3.5 h-3.5" />,
                    text: "5-star review streak: 12 days",
                    color: "text-amber-400 bg-amber-500/10",
                  },
                ].map((alert, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${alert.color} text-xs`}
                  >
                    {alert.icon}
                    <span className="truncate">{alert.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══════════ RECENT ORDERS & TRENDING PRODUCTS ═══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders Table */}
          <Card className="lg:col-span-2 glass gradient-border animate-fade-in-up">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <ShoppingCart className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <span>Recent Orders</span>
                    <p className="text-xs text-muted-foreground font-normal mt-0.5">
                      Latest transactions across your store
                    </p>
                  </div>
                </CardTitle>
                <Link href="/orders">
                  <span className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer">
                    View All <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground/70 font-medium text-xs uppercase tracking-wider">
                      Order
                    </TableHead>
                    <TableHead className="text-muted-foreground/70 font-medium text-xs uppercase tracking-wider">
                      Customer
                    </TableHead>
                    <TableHead className="text-muted-foreground/70 font-medium text-xs uppercase tracking-wider">
                      Product
                    </TableHead>
                    <TableHead className="text-muted-foreground/70 font-medium text-xs uppercase tracking-wider">
                      Status
                    </TableHead>
                    <TableHead className="text-muted-foreground/70 font-medium text-xs uppercase tracking-wider text-right">
                      Profit
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders?.slice(0, 6).map((order, i) => (
                    <TableRow
                      key={order.id}
                      className="border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                    >
                      <TableCell className="font-mono text-sm">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {order.customerName?.charAt(0)?.toUpperCase() ??
                              "?"}
                          </div>
                          <span className="text-sm">{order.customerName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="truncate max-w-[160px] text-sm">
                        {order.productName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium border ${
                            order.status === "delivered"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : order.status === "cancelled"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : order.status === "shipped"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-400 font-medium">
                        +${order.profit?.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Trending Products with Virality Score */}
          <Card className="glass gradient-border animate-fade-in-up">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Flame className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <span>Trending Products</span>
                    <p className="text-xs text-muted-foreground font-normal mt-0.5">
                      Top performers this period
                    </p>
                  </div>
                </CardTitle>
                <Link href="/products">
                  <span className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer">
                    View All <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {viralityScores.slice(0, 5).map((product, index) => (
                  <div
                    key={product.id}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="min-w-0 flex-1 mr-3">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center h-5 w-5 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-[10px] font-bold text-muted-foreground">
                            {index + 1}
                          </span>
                          <Link
                            href={`/products/${product.id}`}
                            className="font-medium text-sm hover:text-primary transition-colors truncate"
                          >
                            {product.name}
                          </Link>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-7">
                          {product.category}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm text-emerald-400 font-semibold">
                          {product.margin?.toFixed(1)}%
                        </div>
                        <Badge
                          variant="outline"
                          className={`mt-1 text-[10px] ${
                            product.status === "listed"
                              ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                              : "bg-white/5 text-muted-foreground border-white/10"
                          }`}
                        >
                          {product.status === "listed" && (
                            <Flame className="w-2.5 h-2.5 mr-0.5" />
                          )}
                          {product.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="ml-7 space-y-2">
                      <ViralityBar
                        score={product.viralityScore}
                        label="Virality Score"
                      />
                      <ViralityBar
                        score={product.velocity}
                        label="Sales Velocity"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══════════ GOALS & BOTTOM ANALYTICS ═══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Goals */}
          <Card className="glass gradient-border animate-fade-in-up">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Trophy className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <span>Revenue Goals</span>
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">
                    Track your milestones
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <GoalProgress
                current={stats?.totalRevenue ?? 0}
                target={5000}
                label="$5K Revenue"
                icon={<DollarSign className="w-4 h-4" />}
              />
              <GoalProgress
                current={stats?.totalProfit ?? 0}
                target={2000}
                label="$2K Profit"
                icon={<TrendingUp className="w-4 h-4" />}
              />
              <GoalProgress
                current={stats?.totalOrders ?? 0}
                target={100}
                label="100 Orders"
                icon={<Package className="w-4 h-4" />}
              />
            </CardContent>
          </Card>

          {/* Weekly Traffic Chart */}
          <Card className="glass gradient-border animate-fade-in-up">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <span>Weekly Traffic</span>
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">
                    Visitors & conversions
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trafficData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(255,255,255,0.04)"
                    />
                    <XAxis
                      dataKey="day"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 15, 20, 0.9)",
                        backdropFilter: "blur(12px)",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                        padding: "10px 14px",
                      }}
                      itemStyle={{ color: "#fff", fontSize: "12px" }}
                      labelStyle={{
                        color: "rgba(255,255,255,0.5)",
                        marginBottom: "4px",
                        fontSize: "11px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="visits"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={false}
                      name="Visits"
                    />
                    <Line
                      type="monotone"
                      dataKey="conversions"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={false}
                      name="Conversions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>{" "}
                  Visits
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-violet-500"></span>{" "}
                  Conversions
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievement Badges */}
          <Card className="glass gradient-border animate-fade-in-up">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Award className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <span>Achievements</span>
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">
                    Your milestones & badges
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    icon: <Rocket className="w-5 h-5" />,
                    label: "First Sale",
                    earned: true,
                    color: "from-blue-500 to-cyan-400",
                  },
                  {
                    icon: <Package className="w-5 h-5" />,
                    label: "50 Orders",
                    earned: true,
                    color: "from-violet-500 to-purple-400",
                  },
                  {
                    icon: <Trophy className="w-5 h-5" />,
                    label: "$1K Profit",
                    earned: (stats?.totalProfit ?? 0) >= 1000,
                    color: "from-amber-500 to-orange-400",
                  },
                  {
                    icon: <Star className="w-5 h-5" />,
                    label: "Top Rated",
                    earned: false,
                    color: "from-pink-500 to-rose-400",
                  },
                  {
                    icon: <Zap className="w-5 h-5" />,
                    label: "Speed Ship",
                    earned: false,
                    color: "from-emerald-500 to-teal-400",
                  },
                  {
                    icon: <Flame className="w-5 h-5" />,
                    label: "Hot Seller",
                    earned: false,
                    color: "from-red-500 to-orange-400",
                  },
                ].map((badge) => (
                  <Tooltip key={badge.label}>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 cursor-default ${
                          badge.earned
                            ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                            : "border-white/[0.03] bg-white/[0.01] opacity-40 grayscale"
                        }`}
                      >
                        <div
                          className={`p-2.5 rounded-xl ${badge.earned ? `bg-gradient-to-br ${badge.color} text-white shadow-lg` : "bg-white/5 text-muted-foreground"}`}
                        >
                          {badge.icon}
                        </div>
                        <span className="text-[10px] text-muted-foreground text-center font-medium">
                          {badge.label}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{badge.earned ? "Earned!" : "Keep going to unlock"}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* Award icon import (not in the main import list) */
function Award(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}
