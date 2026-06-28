import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone,
  Plus,
  Trash2,
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Campaign = {
  id: number;
  campaignName: string;
  platform: string;
  productName: string | null;
  spend: string;
  revenue: string;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

type Stats = {
  totalSpend: number;
  totalRevenue: number;
  roas: number;
  ctr: number;
  cpc: number;
  cpa: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  activeCampaigns: number;
  byPlatform: {
    platform: string;
    spend: number;
    revenue: number;
    roas: number;
    campaigns: number;
  }[];
};

const PLATFORMS = [
  "facebook",
  "tiktok",
  "instagram",
  "google",
  "youtube",
  "pinterest",
  "other",
];
const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#3b82f6",
  tiktok: "#ec4899",
  instagram: "#a855f7",
  google: "#10b981",
  youtube: "#ef4444",
  pinterest: "#f97316",
  other: "#6366f1",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}
function fmtShort(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

const EMPTY_FORM = {
  campaignName: "",
  platform: "facebook",
  productName: "",
  spend: "",
  revenue: "",
  impressions: "",
  clicks: "",
  conversions: "",
};

export default function AdSpendPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: campaigns = [], isLoading: campsLoading } = useQuery<
    Campaign[]
  >({
    queryKey: ["ad-campaigns"],
    queryFn: () => fetch(`${BASE}/api/ad-campaigns`).then((r) => r.json()),
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ["ad-campaigns-stats"],
    queryFn: () =>
      fetch(`${BASE}/api/ad-campaigns/stats`).then((r) => r.json()),
  });

  const create = useMutation({
    mutationFn: (body: object) =>
      fetch(`${BASE}/api/ad-campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ad-campaigns"] });
      qc.invalidateQueries({ queryKey: ["ad-campaigns-stats"] });
      setShowNew(false);
      setForm(EMPTY_FORM);
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      fetch(`${BASE}/api/ad-campaigns/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ad-campaigns"] });
      qc.invalidateQueries({ queryKey: ["ad-campaigns-stats"] });
      toast({ title: "Campaign deleted" });
    },
  });

  const handleCreate = () => {
    create.mutate({
      ...form,
      spend: parseFloat(form.spend) || 0,
      revenue: parseFloat(form.revenue) || 0,
      impressions: parseInt(form.impressions) || 0,
      clicks: parseInt(form.clicks) || 0,
      conversions: parseInt(form.conversions) || 0,
    });
  };

  const roasColor = (roas: number) =>
    roas >= 3
      ? "text-emerald-400"
      : roas >= 2
        ? "text-yellow-400"
        : "text-red-400";

  const STAT_CARDS = [
    {
      label: "Total Spend",
      value: fmtShort(stats?.totalSpend ?? 0),
      icon: DollarSign,
      color: "text-red-400",
    },
    {
      label: "Total Revenue",
      value: fmtShort(stats?.totalRevenue ?? 0),
      icon: TrendingUp,
      color: "text-emerald-400",
    },
    {
      label: "Avg ROAS",
      value: `${(stats?.roas ?? 0).toFixed(2)}x`,
      icon: TrendingUp,
      color: roasColor(stats?.roas ?? 0),
    },
    {
      label: "Total Impressions",
      value: (stats?.totalImpressions ?? 0).toLocaleString(),
      icon: Eye,
      color: "text-blue-400",
    },
    {
      label: "Total Clicks",
      value: (stats?.totalClicks ?? 0).toLocaleString(),
      icon: MousePointerClick,
      color: "text-purple-400",
    },
    {
      label: "Avg CTR",
      value: `${(stats?.ctr ?? 0).toFixed(2)}%`,
      icon: MousePointerClick,
      color: "text-orange-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" /> Ad Spend & ROAS
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track ad spend, revenue attribution, and ROAS across every platform
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Campaign
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {STAT_CARDS.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-xl font-bold mt-0.5 ${s.color}`}>
                    {s.value}
                  </p>
                </div>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(stats?.byPlatform?.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Spend by Platform
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats?.byPlatform ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="platform"
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
                    formatter={(v: any) => fmt(Number(v))}
                  />
                  <Bar dataKey="spend" name="Spend" radius={[4, 4, 0, 0]}>
                    {stats?.byPlatform.map((p) => (
                      <Cell
                        key={p.platform}
                        fill={PLATFORM_COLORS[p.platform] ?? "#6366f1"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                ROAS by Platform
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 pt-2">
                {stats?.byPlatform.map((p) => (
                  <div key={p.platform} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        background: PLATFORM_COLORS[p.platform] ?? "#6366f1",
                      }}
                    />
                    <span className="text-sm capitalize w-20">
                      {p.platform}
                    </span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, p.roas * 25)}%`,
                          background: PLATFORM_COLORS[p.platform] ?? "#6366f1",
                        }}
                      />
                    </div>
                    <span
                      className={`text-sm font-semibold w-12 text-right ${roasColor(p.roas)}`}
                    >
                      {p.roas.toFixed(2)}x
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showNew && (
        <Card className="border-primary/40">
          <CardContent className="p-5">
            <p className="text-sm font-semibold mb-4">Add Campaign</p>
            <div className="grid grid-cols-3 gap-3">
              <Input
                placeholder="Campaign name"
                value={form.campaignName}
                onChange={(e) =>
                  setForm({ ...form, campaignName: e.target.value })
                }
              />
              <select
                className="bg-muted border border-border rounded-md px-3 py-2 text-sm"
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Product name (optional)"
                value={form.productName}
                onChange={(e) =>
                  setForm({ ...form, productName: e.target.value })
                }
              />
              <Input
                placeholder="Spend ($)"
                type="number"
                value={form.spend}
                onChange={(e) => setForm({ ...form, spend: e.target.value })}
              />
              <Input
                placeholder="Revenue ($)"
                type="number"
                value={form.revenue}
                onChange={(e) => setForm({ ...form, revenue: e.target.value })}
              />
              <Input
                placeholder="Impressions"
                type="number"
                value={form.impressions}
                onChange={(e) =>
                  setForm({ ...form, impressions: e.target.value })
                }
              />
              <Input
                placeholder="Clicks"
                type="number"
                value={form.clicks}
                onChange={(e) => setForm({ ...form, clicks: e.target.value })}
              />
              <Input
                placeholder="Conversions"
                type="number"
                value={form.conversions}
                onChange={(e) =>
                  setForm({ ...form, conversions: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleCreate}
                disabled={!form.campaignName.trim()}
              >
                Add Campaign
              </Button>
              <Button variant="outline" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">All Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {campsLoading ? (
            <div className="p-5">
              <div className="h-20 bg-muted animate-pulse rounded" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">
                No campaigns yet — add your first ad campaign above
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">
                    Campaign
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">
                    Platform
                  </th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground">
                    Spend
                  </th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground">
                    Revenue
                  </th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground">
                    ROAS
                  </th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground">
                    Clicks
                  </th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground">
                    Conv.
                  </th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const spend = Number(c.spend ?? 0);
                  const revenue = Number(c.revenue ?? 0);
                  const roas = spend > 0 ? revenue / spend : 0;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium max-w-[180px] truncate">
                        {c.campaignName}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              background:
                                PLATFORM_COLORS[c.platform] ?? "#6366f1",
                            }}
                          />
                          <span className="capitalize text-xs">
                            {c.platform}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-red-400">
                        {fmt(spend)}
                      </td>
                      <td className="px-3 py-3 text-right text-emerald-400">
                        {fmt(revenue)}
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-bold ${roasColor(roas)}`}
                      >
                        {roas.toFixed(2)}x
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground">
                        {(c.clicks ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground">
                        {c.conversions ?? 0}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => remove.mutate(c.id)}
                          className="text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
