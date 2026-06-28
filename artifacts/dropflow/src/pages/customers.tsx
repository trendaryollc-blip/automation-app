import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, ShoppingCart, Star, Search, Crown, AlertTriangle, UserCheck, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useListOrders } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}
function shortDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type SortKey = "ltv" | "orders" | "recent" | "profit" | "rfm";
type ViewMode = "list" | "rfm";

type RfmCustomer = {
  name: string; email: string | null;
  r: number; f: number; m: number; rfmScore: number; segment: string;
  daysSinceLast: number; orderCount: number; totalSpend: number; avgOrder: number;
};

const SEGMENT_CONFIG: Record<string, { color: string; icon: any; desc: string }> = {
  "Champions":      { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: Crown, desc: "Bought recently, buy often, spend the most" },
  "Loyal":          { color: "bg-blue-500/15 text-blue-400 border-blue-500/20", icon: Star, desc: "Order regularly with solid spend" },
  "Promising":      { color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20", icon: TrendingUp, desc: "Recent buyers with growing potential" },
  "New Customers":  { color: "bg-purple-500/15 text-purple-400 border-purple-500/20", icon: UserCheck, desc: "Bought recently but not often" },
  "Needs Attention":{ color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", icon: AlertTriangle, desc: "Below average — re-engage soon" },
  "At Risk":        { color: "bg-orange-500/15 text-orange-400 border-orange-500/20", icon: AlertTriangle, desc: "Used to be valuable, haven't bought in a while" },
  "Cant Lose Them": { color: "bg-red-500/15 text-red-400 border-red-500/20", icon: AlertTriangle, desc: "Big spenders going inactive — act now" },
  "Lost":           { color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20", icon: UserX, desc: "Lowest recency, frequency, and spend" },
};

export default function CustomersPage() {
  const { data: allOrders = [], isLoading: ordersLoading } = useListOrders();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("ltv");
  const [view, setView] = useState<ViewMode>("list");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");

  const { data: rfmData, isLoading: rfmLoading } = useQuery<{
    customers: RfmCustomer[]; segments: Record<string, number>; totalCustomers: number; avgSpend: number;
  }>({
    queryKey: ["customers-rfm"],
    queryFn: () => fetch(`${BASE}/api/customers/rfm`).then((r) => r.json()),
  });

  const customers = useMemo(() => {
    const map: Record<string, any> = {};
    for (const o of allOrders) {
      const key = (o.customerEmail || o.customerName || "").toLowerCase();
      if (!key) continue;
      if (!map[key]) {
        map[key] = { name: o.customerName || "Unknown", email: o.customerEmail || null, orders: [], ltv: 0, profit: 0, lastOrder: null as string | null, products: new Set<string>() };
      }
      const c = map[key];
      c.orders.push(o);
      c.ltv += Number(o.sellPrice ?? 0) * Number(o.quantity ?? 1);
      c.profit += Number(o.profit ?? 0);
      const created = o.createdAt ?? "";
      if (!c.lastOrder || created > c.lastOrder) c.lastOrder = created;
      if (o.productName) c.products.add(o.productName);
    }
    return Object.values(map).map((c) => ({
      ...c,
      orderCount: c.orders.length,
      deliveredCount: c.orders.filter((o: any) => o.status === "delivered").length,
      cancelledCount: c.orders.filter((o: any) => o.status === "cancelled").length,
      avgOrder: c.ltv / Math.max(c.orders.length, 1),
      products: Array.from(c.products as Set<string>),
      segment: c.ltv > 500 ? "VIP" : c.ltv > 100 ? "Regular" : "New",
    }));
  }, [allOrders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = q ? customers.filter((c) => c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)) : customers;
    return [...list].sort((a, b) => {
      if (sortBy === "ltv") return b.ltv - a.ltv;
      if (sortBy === "orders") return b.orderCount - a.orderCount;
      if (sortBy === "profit") return b.profit - a.profit;
      if (sortBy === "recent") return (b.lastOrder ?? "").localeCompare(a.lastOrder ?? "");
      return 0;
    });
  }, [customers, search, sortBy]);

  const rfmFiltered = useMemo(() => {
    const list = rfmData?.customers ?? [];
    const q = search.toLowerCase().trim();
    return list
      .filter((c) => segmentFilter === "all" || c.segment === segmentFilter)
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
  }, [rfmData, search, segmentFilter]);

  const totalLtv = customers.reduce((s, c) => s + c.ltv, 0);
  const vipCount = customers.filter((c) => c.segment === "VIP").length;
  const avgLtv = customers.length > 0 ? totalLtv / customers.length : 0;

  const SORTS: { key: SortKey; label: string }[] = [
    { key: "ltv", label: "Revenue" },
    { key: "profit", label: "Profit" },
    { key: "orders", label: "Orders" },
    { key: "recent", label: "Recent" },
  ];

  const isLoading = ordersLoading || rfmLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">Customer intelligence — LTV, purchase history & RFM segmentation</p>
        </div>
        <div className="flex bg-muted rounded-lg p-1 gap-1">
          <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === "list" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Customer List
          </button>
          <button onClick={() => setView("rfm")} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === "rfm" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            RFM Segments
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total Customers</p><p className="text-2xl font-bold mt-0.5">{customers.length}</p></div><Users className="w-4 h-4 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold mt-0.5 text-emerald-400">{fmt(totalLtv)}</p></div><TrendingUp className="w-4 h-4 text-emerald-400" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Avg LTV</p><p className="text-2xl font-bold mt-0.5 text-primary">{fmt(avgLtv)}</p></div><Star className="w-4 h-4 text-primary" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">VIP Customers</p><p className="text-2xl font-bold mt-0.5 text-yellow-400">{vipCount}</p></div><Crown className="w-4 h-4 text-yellow-400" /></div></CardContent></Card>
      </div>

      {view === "list" && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search customers…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1">
              {SORTS.map((s) => (
                <button key={s.key} onClick={() => setSortBy(s.key)}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors border ${sortBy === s.key ? "bg-primary/10 text-primary border-primary/20" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Card key={i}><CardContent className="p-4"><div className="h-10 bg-muted animate-pulse rounded" /></CardContent></Card>)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-20" /><p className="text-sm">No customers yet</p></div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Customer</th><th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Orders</th><th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Revenue</th><th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Avg Order</th><th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Last Order</th><th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Tier</th></tr></thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3"><div className="font-medium">{c.name}</div>{c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}</td>
                        <td className="px-4 py-3 text-right"><div>{c.orderCount}</div><div className="text-xs text-muted-foreground">{c.deliveredCount} delivered</div></td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-400">{fmt(c.ltv)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{fmt(c.avgOrder)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{shortDate(c.lastOrder)}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className={c.segment === "VIP" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" : c.segment === "Regular" ? "bg-blue-500/15 text-blue-400 border-blue-500/20" : "bg-muted text-muted-foreground"}>{c.segment}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {view === "rfm" && (
        <>
          {rfmData?.segments && (
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(SEGMENT_CONFIG).map(([seg, cfg]) => {
                const count = rfmData.segments[seg] ?? 0;
                const Icon = cfg.icon;
                return (
                  <button key={seg}
                    onClick={() => setSegmentFilter(segmentFilter === seg ? "all" : seg)}
                    className={`text-left p-3 rounded-lg border transition-all ${segmentFilter === seg ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40"} bg-card`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3 h-3" />
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>{seg}</Badge>
                    </div>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{cfg.desc}</p>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {segmentFilter !== "all" && (
              <button onClick={() => setSegmentFilter("all")} className="text-xs text-primary hover:underline">Clear filter</button>
            )}
          </div>

          {rfmLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Card key={i}><CardContent className="p-4"><div className="h-10 bg-muted animate-pulse rounded" /></CardContent></Card>)}</div>
          ) : rfmFiltered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-20" /><p className="text-sm">No customers in this segment</p></div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Customer</th><th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground">R</th><th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground">F</th><th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground">M</th><th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground">Spend</th><th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground">Orders</th><th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground">Last Order</th><th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Segment</th></tr></thead>
                  <tbody>
                    {rfmFiltered.map((c, i) => {
                      const cfg = SEGMENT_CONFIG[c.segment];
                      return (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3"><div className="font-medium">{c.name}</div>{c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}</td>
                          {[c.r, c.f, c.m].map((score, si) => (
                            <td key={si} className="px-3 py-3 text-center">
                              <span className={`w-6 h-6 inline-flex items-center justify-center rounded font-bold text-xs ${score >= 4 ? "bg-emerald-500/20 text-emerald-400" : score >= 3 ? "bg-blue-500/20 text-blue-400" : score >= 2 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>{score}</span>
                            </td>
                          ))}
                          <td className="px-3 py-3 text-right font-semibold text-emerald-400">{fmt(c.totalSpend)}</td>
                          <td className="px-3 py-3 text-right text-muted-foreground">{c.orderCount}</td>
                          <td className="px-3 py-3 text-right text-muted-foreground">{c.daysSinceLast}d ago</td>
                          <td className="px-4 py-3">
                            {cfg && <Badge variant="outline" className={`text-xs ${cfg.color}`}>{c.segment}</Badge>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
