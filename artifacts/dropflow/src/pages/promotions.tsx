import { useState } from "react";
import {
  Tag,
  Plus,
  Trash2,
  TrendingDown,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListProducts } from "@workspace/api-client-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API = "/api";

function fmt(n: number | string | null | undefined) {
  return Number(n ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}
function shortDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  expired: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  paused: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

interface Promotion {
  id: number;
  name: string;
  code: string;
  type: string;
  value: string;
  productName: string;
  status: string;
  startDate: string;
  endDate: string;
  usageCount: number;
  revenueImpact: string;
  notes: string;
  createdAt: string;
}

export default function PromotionsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: products = [] } = useListProducts();
  const { data: promos = [] } = useQuery<Promotion[]>({
    queryKey: ["promotions"],
    queryFn: () => fetch(`${API}/promotions`).then((r) => r.json()),
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("percentage");
  const [value, setValue] = useState("");
  const [productId, setProductId] = useState("");
  const [status, setStatus] = useState("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [usageCount, setUsageCount] = useState("0");
  const [revenueImpact, setRevenueImpact] = useState("");

  const createMut = useMutation({
    mutationFn: (body: any) =>
      fetch(`${API}/promotions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions"] });
      setShowForm(false);
      setName("");
      setCode("");
      setValue("");
      setProductId("");
      setNotes("");
      setUsageCount("0");
      setRevenueImpact("");
      toast({ title: "Promotion created" });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: any) =>
      fetch(`${API}/promotions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions"] });
      toast({ title: "Promotion updated" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      fetch(`${API}/promotions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions"] });
      toast({ title: "Promotion deleted" });
    },
  });

  const handleCreate = () => {
    if (!name || !value) {
      toast({ title: "Name and value are required", variant: "destructive" });
      return;
    }
    const product = products.find((p) => String(p.id) === productId);
    createMut.mutate({
      name,
      code,
      type,
      value: Number(value),
      productId: productId ? Number(productId) : null,
      productName: product?.name ?? null,
      status,
      startDate: startDate || null,
      endDate: endDate || null,
      notes,
      usageCount: Number(usageCount),
      revenueImpact: revenueImpact ? Number(revenueImpact) : null,
    });
  };

  const active = promos.filter((p) => p.status === "active").length;
  const totalImpact = promos.reduce(
    (s, p) => s + Number(p.revenueImpact || 0),
    0,
  );

  const chartData = promos
    .filter((p) => p.usageCount > 0)
    .map((p) => ({
      name: p.name.length > 12 ? p.name.slice(0, 11) + "…" : p.name,
      usage: p.usageCount,
      impact: Math.abs(Number(p.revenueImpact || 0)),
    }));

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" /> Promotions & Discounts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track discount campaigns and measure their impact on revenue.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((x) => !x)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Promotion
        </Button>
      </div>

      {promos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Active</div>
              <div className="text-2xl font-bold text-green-400">{active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">
                Total Promotions
              </div>
              <div className="text-2xl font-bold">{promos.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Revenue Impact
              </div>
              <div className="text-2xl font-bold text-red-400">
                {fmt(totalImpact)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Usage by Promotion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-44">
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
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="usage"
                    fill="#818cf8"
                    radius={[4, 4, 0, 0]}
                    name="Uses"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New Promotion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Promotion Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Summer Sale 20%"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Coupon Code (optional)</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="SUMMER20"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Discount Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                    <SelectItem value="bogo">Buy One Get One</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Value {type === "percentage" ? "(%)" : "($)"}</Label>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === "percentage" ? "20" : "10.00"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Product (optional)</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All products</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Usage Count</Label>
                <Input
                  type="number"
                  value={usageCount}
                  onChange={(e) => setUsageCount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Revenue Impact ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    -$
                  </span>
                  <Input
                    className="pl-8"
                    type="number"
                    value={revenueImpact}
                    onChange={(e) => setRevenueImpact(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes…"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createMut.isPending}>
                Create Promotion
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {promos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Tag className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium">No promotions yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Track discount campaigns to understand their effect on margins.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {promos.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{p.name}</span>
                      <Badge
                        className={`text-xs border ${STATUS_STYLES[p.status] || STATUS_STYLES.active}`}
                      >
                        {p.status}
                      </Badge>
                      {p.code && (
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                          {p.code}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span>
                        {p.type === "percentage"
                          ? `${Number(p.value)}% off`
                          : p.type === "fixed"
                            ? `${fmt(p.value)} off`
                            : p.type}
                      </span>
                      {p.productName && <span>{p.productName}</span>}
                      {p.usageCount > 0 && <span>{p.usageCount} uses</span>}
                      {Number(p.revenueImpact) !== 0 && (
                        <span className="text-red-400">
                          Impact: {fmt(p.revenueImpact)}
                        </span>
                      )}
                      {p.startDate && (
                        <span>
                          {shortDate(p.startDate)} → {shortDate(p.endDate)}
                        </span>
                      )}
                    </div>
                    {p.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {p.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() =>
                          updateMut.mutate({ id: p.id, status: "paused" })
                        }
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Pause
                      </Button>
                    )}
                    {p.status === "paused" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 text-green-400 border-green-500/30"
                        onClick={() =>
                          updateMut.mutate({ id: p.id, status: "active" })
                        }
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteMut.mutate(p.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
