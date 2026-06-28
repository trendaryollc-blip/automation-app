import { useState, useCallback } from "react";
import { FileBarChart, Download, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useGetPlReport } from "@workspace/api-client-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function pct(n: number) {
  return n.toFixed(1) + "%";
}

function toLocalDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: toLocalDateString(from), to: toLocalDateString(to) };
}

type GroupBy = "product" | "supplier" | "status";

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "product", label: "By Product" },
  { value: "supplier", label: "By Supplier" },
  { value: "status", label: "By Status" },
];

function marginColor(m: number) {
  if (m >= 40) return "text-green-400";
  if (m >= 20) return "text-yellow-400";
  return "text-red-400";
}

function exportCSV(
  rows: {
    label: string;
    orderCount: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    margin: number;
  }[],
  from: string,
  to: string,
  groupBy: string,
) {
  const header = [
    "Label",
    "Orders",
    "Revenue",
    "COGS",
    "Gross Profit",
    "Margin %",
  ];
  const lines = [
    `P&L Report — ${from} to ${to} — grouped by ${groupBy}`,
    "",
    header.join(","),
    ...rows.map((r) =>
      [
        r.label,
        r.orderCount,
        r.revenue.toFixed(2),
        r.cogs.toFixed(2),
        r.grossProfit.toFixed(2),
        r.margin.toFixed(1),
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pl-report-${from}-to-${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PlReportPage() {
  const def = defaultRange();
  const [from, setFrom] = useState(def.from);
  const [to, setTo] = useState(def.to);
  const [groupBy, setGroupBy] = useState<GroupBy>("product");
  const [queryParams, setQueryParams] = useState<{
    from: string;
    to: string;
    groupBy: GroupBy;
  }>({ ...def, groupBy: "product" });

  const { data: report, isFetching } = useGetPlReport(
    {
      from: queryParams.from,
      to: queryParams.to,
      groupBy: queryParams.groupBy,
    },
    {
      query: {
        enabled: !!(queryParams.from && queryParams.to),
        queryKey: [
          "pl-report",
          queryParams.from,
          queryParams.to,
          queryParams.groupBy,
        ],
      },
    },
  );

  const handleGenerate = useCallback(() => {
    setQueryParams({ from, to, groupBy });
  }, [from, to, groupBy]);

  const handleExport = () => {
    if (!report) return;
    exportCSV(
      report.rows,
      report.from.slice(0, 10),
      report.to.slice(0, 10),
      report.groupBy,
    );
  };

  const chartData =
    report?.rows.slice(0, 10).map((r) => ({
      name: r.label.length > 18 ? r.label.slice(0, 16) + "…" : r.label,
      Revenue: r.revenue,
      COGS: r.cogs,
      Profit: r.grossProfit,
    })) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-primary" />
            Profit & Loss Report
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Breakdown of revenue, cost of goods, and gross profit over a date
            range.
          </p>
        </div>
        {report && (
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Group By</Label>
              <div className="flex gap-1">
                {GROUP_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setGroupBy(o.value)}
                    className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                      groupBy === o.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isFetching}
              className="h-9"
            >
              {isFetching ? (
                <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1.5" />
              )}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {isFetching && (
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-3">
                <div className="h-8 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {report && !isFetching && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">
                  Total Revenue
                </div>
                <div className="text-xl font-bold text-primary">
                  {fmt(report.totalRevenue)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">
                  Total COGS
                </div>
                <div className="text-xl font-bold">{fmt(report.totalCogs)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">
                  Gross Profit
                </div>
                <div
                  className={`text-xl font-bold ${report.totalGrossProfit >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {fmt(report.totalGrossProfit)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">
                  Gross Margin
                </div>
                <div
                  className={`text-xl font-bold ${marginColor(report.totalMargin)}`}
                >
                  {pct(report.totalMargin)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">
                  Total Orders
                </div>
                <div className="text-xl font-bold">{report.totalOrders}</div>
              </CardContent>
            </Card>
          </div>

          {report.rows.length === 0 ? (
            <Card className="flex items-center justify-center py-16">
              <p className="text-muted-foreground text-sm">
                No orders found in this date range.
              </p>
            </Card>
          ) : (
            <>
              {/* Bar chart — top 10 rows */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      Revenue vs COGS vs Profit
                      {report.rows.length > 10 && (
                        <span className="text-muted-foreground font-normal ml-1">
                          (top 10 shown)
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
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
                            tick={{ fontSize: 11, fill: "#6b7280" }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "#6b7280" }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `$${v}`}
                            width={52}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "#1f2937",
                              border: "1px solid #374151",
                              borderRadius: 6,
                              fontSize: 12,
                            }}
                            labelStyle={{ color: "#9ca3af" }}
                            formatter={(v: number) => fmt(v)}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 12, color: "#9ca3af" }}
                          />
                          <Bar
                            dataKey="Revenue"
                            fill="#6366f1"
                            radius={[3, 3, 0, 0]}
                          />
                          <Bar
                            dataKey="COGS"
                            fill="#f59e0b"
                            radius={[3, 3, 0, 0]}
                          />
                          <Bar
                            dataKey="Profit"
                            fill="#22c55e"
                            radius={[3, 3, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Detail table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Breakdown — {report.rows.length} {queryParams.groupBy}
                    {report.rows.length !== 1 ? "s" : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                          <th className="text-left pb-2 pr-4">Label</th>
                          <th className="text-right pb-2 pr-4">Orders</th>
                          <th className="text-right pb-2 pr-4">Revenue</th>
                          <th className="text-right pb-2 pr-4">COGS</th>
                          <th className="text-right pb-2 pr-4">Gross Profit</th>
                          <th className="text-right pb-2">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {report.rows.map((r) => (
                          <tr
                            key={r.label}
                            className="hover:bg-accent/30 transition-colors"
                          >
                            <td className="py-2 pr-4 font-medium">{r.label}</td>
                            <td className="py-2 pr-4 text-right text-muted-foreground">
                              {r.orderCount}
                            </td>
                            <td className="py-2 pr-4 text-right">
                              {fmt(r.revenue)}
                            </td>
                            <td className="py-2 pr-4 text-right text-muted-foreground">
                              {fmt(r.cogs)}
                            </td>
                            <td
                              className={`py-2 pr-4 text-right font-semibold ${r.grossProfit >= 0 ? "text-green-400" : "text-red-400"}`}
                            >
                              {fmt(r.grossProfit)}
                            </td>
                            <td className="py-2 text-right">
                              <Badge
                                variant="outline"
                                className={`text-xs font-semibold ${
                                  r.margin >= 40
                                    ? "border-green-500/30 text-green-400 bg-green-500/10"
                                    : r.margin >= 20
                                      ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                                      : "border-red-500/30 text-red-400 bg-red-500/10"
                                }`}
                              >
                                {pct(r.margin)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Totals row */}
                      <tfoot>
                        <tr className="border-t-2 border-border font-semibold">
                          <td className="pt-3 pr-4">Total</td>
                          <td className="pt-3 pr-4 text-right">
                            {report.totalOrders}
                          </td>
                          <td className="pt-3 pr-4 text-right text-primary">
                            {fmt(report.totalRevenue)}
                          </td>
                          <td className="pt-3 pr-4 text-right text-muted-foreground">
                            {fmt(report.totalCogs)}
                          </td>
                          <td
                            className={`pt-3 pr-4 text-right ${report.totalGrossProfit >= 0 ? "text-green-400" : "text-red-400"}`}
                          >
                            {fmt(report.totalGrossProfit)}
                          </td>
                          <td className="pt-3 text-right">
                            <Badge
                              variant="outline"
                              className={`text-xs font-bold ${
                                report.totalMargin >= 40
                                  ? "border-green-500/30 text-green-400 bg-green-500/10"
                                  : report.totalMargin >= 20
                                    ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                                    : "border-red-500/30 text-red-400 bg-red-500/10"
                              }`}
                            >
                              {pct(report.totalMargin)}
                            </Badge>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
