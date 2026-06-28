import { useState } from "react";
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
import { Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowUpRight,
  TrendingUp,
  Package,
  Truck,
  ShoppingCart,
  DollarSign,
  Activity,
  BarChart3,
  AlertTriangle,
  X,
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
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

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

  if (statsLoading || ordersLoading || trendingLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">War Room</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Activity className="h-4 w-4" /> System Status:{" "}
            {health?.status === "ok" ? (
              <span className="text-green-500 font-medium">Operational</span>
            ) : (
              <span className="text-destructive">Degraded</span>
            )}
          </p>
        </div>
      </div>

      {stockAlerts.length > 0 && !alertsDismissed && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-orange-400">
                  {stockAlerts.length} product
                  {stockAlerts.length !== 1 ? "s" : ""} running low on stock
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {stockAlerts.map((a) => (
                    <Link key={a.id} href={`/products/${a.id}`}>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-orange-500/15 text-orange-300 border border-orange-500/20 hover:bg-orange-500/25 transition-colors cursor-pointer">
                        {a.name}
                        <span className="font-mono font-bold">
                          {a.stockQuantity}
                        </span>
                        <span className="text-orange-400/60">
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
              className="shrink-0 text-orange-400/60 hover:text-orange-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {stats?.totalRevenue?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) ?? "0.00"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              $
              {stats?.totalProfit?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) ?? "0.00"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pendingOrders ?? 0}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / {stats?.totalOrders ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgMargin?.toFixed(1) ?? "0.0"}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Revenue & Analytics
          </CardTitle>
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/50">
            <button
              onClick={() => setPeriod("weekly")}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${period === "weekly" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${period === "monthly" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
            >
              Monthly
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[300px]">
              <Skeleton className="h-full w-full rounded-lg" />
              <Skeleton className="h-full w-full rounded-lg" />
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-[300px] flex flex-col">
                <h3 className="text-sm font-medium mb-4 text-muted-foreground">
                  Revenue & Profit
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analytics.data}
                    margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(217 91% 60%)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(217 91% 60%)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorProfit"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#22c55e"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#22c55e"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
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
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        `$${value >= 1000 ? (value / 1000).toFixed(0) + "k" : value}`
                      }
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      labelStyle={{
                        color: "hsl(var(--muted-foreground))",
                        marginBottom: "4px",
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
                            period === "weekly" ? "MMM d, yyyy" : "MMMM yyyy",
                          );
                        } catch (e) {
                          return label;
                        }
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(217 91% 60%)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      name="Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorProfit)"
                      name="Profit"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="h-[300px] flex flex-col">
                <h3 className="text-sm font-medium mb-4 text-muted-foreground">
                  Order Volume
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.data}
                    margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
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
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      labelStyle={{
                        color: "hsl(var(--muted-foreground))",
                        marginBottom: "4px",
                      }}
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                      labelFormatter={(label: any) => {
                        if (!label) return "";
                        try {
                          return format(
                            new Date(label),
                            period === "weekly" ? "MMM d, yyyy" : "MMMM yyyy",
                          );
                        } catch (e) {
                          return label;
                        }
                      }}
                    />
                    <Bar
                      dataKey="orderCount"
                      fill="hsl(262.1 83.3% 57.8%)"
                      radius={[4, 4, 0, 0]}
                      name="Orders"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="h-[300px] flex flex-col space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Period Summary
                </h3>
                <div className="flex-1 bg-muted/30 border border-border/50 rounded-lg p-6 flex flex-col justify-center space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Revenue
                    </p>
                    <div className="flex items-baseline gap-3">
                      <h4 className="text-3xl font-bold tracking-tight">
                        ${analytics.totalRevenue.toLocaleString()}
                      </h4>
                      <span
                        className={`text-sm font-medium ${analytics.revenueChange >= 0 ? "text-green-500" : "text-destructive"}`}
                      >
                        {analytics.revenueChange > 0 ? "+" : ""}
                        {analytics.revenueChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Profit
                    </p>
                    <div className="flex items-baseline gap-3">
                      <h4 className="text-3xl font-bold tracking-tight text-green-500">
                        ${analytics.totalProfit.toLocaleString()}
                      </h4>
                      <span
                        className={`text-sm font-medium ${analytics.profitChange >= 0 ? "text-green-500" : "text-destructive"}`}
                      >
                        {analytics.profitChange > 0 ? "+" : ""}
                        {analytics.profitChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Orders
                    </p>
                    <div className="flex items-baseline gap-3">
                      <h4 className="text-3xl font-bold tracking-tight">
                        {analytics.totalOrders.toLocaleString()}
                      </h4>
                      <span
                        className={`text-sm font-medium ${analytics.ordersChange >= 0 ? "text-green-500" : "text-destructive"}`}
                      >
                        {analytics.ordersChange > 0 ? "+" : ""}
                        {analytics.ordersChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              Failed to load analytics data
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders?.slice(0, 5).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono">
                      <Link
                        href={`/orders/${order.id}`}
                        className="hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell className="truncate max-w-[150px]">
                      {order.productName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.status === "delivered"
                            ? "default"
                            : order.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-500">
                      ${order.profit?.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Trending Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trendingProducts?.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="min-w-0 flex-1 mr-4">
                    <Link
                      href={`/products/${product.id}`}
                      className="font-medium hover:underline truncate block"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {product.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-green-500">
                      {product.margin?.toFixed(1)}%
                    </div>
                    <Badge variant="outline" className="mt-1">
                      {product.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
