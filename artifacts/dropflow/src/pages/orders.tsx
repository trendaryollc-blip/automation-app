import { useState, useMemo } from "react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOrders,
  getListOrdersQueryKey,
  useCreateOrder,
  useBulkUpdateOrders,
  useGetCustomerInsights,
  type Order,
  type OrderStatus,
} from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, ChevronRight, TrendingUp, ShoppingCart, DollarSign, Package, Download, Search, Send, Truck, CheckCircle, X, Zap } from "lucide-react";

function exportOrdersCsv(orders: Order[]) {
  const headers = ["orderNumber", "customerName", "customerEmail", "productName", "quantity", "status", "costPrice", "sellPrice", "profit", "supplierName", "trackingNumber", "createdAt"];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = orders.map((o) =>
    [o.orderNumber, o.customerName, o.customerEmail, o.productName, o.quantity, o.status, o.costPrice, o.sellPrice, o.profit, o.supplierName, o.trackingNumber, o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : ""]
      .map(escape).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dropflow-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20",
  placed: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20",
  shipped: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20",
  delivered: "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20",
};

function getStatusBadge(status: string) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status] || ""}>
      {status}
    </Badge>
  );
}

function CustomerInsightsPanel() {
  const { data: insights = [], isLoading } = useGetCustomerInsights();
  const [selected, setSelected] = useState<string | null>(null);

  const selectedCustomer = useMemo(
    () => insights.find((c) => c.customerName === selected) ?? null,
    [insights, selected]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No customer data yet. Create some orders to see insights here.
      </div>
    );
  }

  const top = insights[0];

  return (
    <div className="space-y-4">
      {/* Top-level KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Users className="w-3.5 h-3.5" /> Unique Customers
            </div>
            <div className="text-2xl font-bold">{insights.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Top Customer Revenue
            </div>
            <div className="text-xl font-bold text-primary">{fmt(top.totalRevenue)}</div>
            <div className="text-xs text-muted-foreground truncate">{top.customerName}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Avg Order Value
            </div>
            <div className="text-2xl font-bold">
              {fmt(insights.reduce((s, c) => s + c.avgOrderValue, 0) / insights.length)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column: ranking list + detail */}
      <div className="grid grid-cols-5 gap-4">
        {/* Ranking list */}
        <div className="col-span-2 space-y-1">
          {insights.map((c, i) => (
            <button
              key={c.customerName}
              onClick={() => setSelected(selected === c.customerName ? null : c.customerName)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                selected === c.customerName
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50 border border-transparent"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0
                    ? "bg-amber-500/20 text-amber-400"
                    : i === 1
                    ? "bg-slate-500/20 text-slate-300"
                    : i === 2
                    ? "bg-orange-700/20 text-orange-500"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{c.customerName}</div>
                <div className="text-xs text-muted-foreground">{c.orderCount} order{c.orderCount !== 1 ? "s" : ""}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-primary">{fmt(c.totalRevenue)}</div>
                <div className="text-xs text-muted-foreground">{fmt(c.totalProfit)} profit</div>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${selected === c.customerName ? "rotate-90" : ""}`} />
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="col-span-3">
          {selectedCustomer ? (
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{selectedCustomer.customerName}</CardTitle>
                    {selectedCustomer.customerEmail && (
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedCustomer.customerEmail}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {selectedCustomer.orderCount} order{selectedCustomer.orderCount !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-muted/40 rounded-md p-2">
                    <div className="text-xs text-muted-foreground">Revenue</div>
                    <div className="font-semibold text-sm text-primary">{fmt(selectedCustomer.totalRevenue)}</div>
                  </div>
                  <div className="bg-muted/40 rounded-md p-2">
                    <div className="text-xs text-muted-foreground">Profit</div>
                    <div className="font-semibold text-sm text-green-400">{fmt(selectedCustomer.totalProfit)}</div>
                  </div>
                  <div className="bg-muted/40 rounded-md p-2">
                    <div className="text-xs text-muted-foreground">Avg Order</div>
                    <div className="font-semibold text-sm">{fmt(selectedCustomer.avgOrderValue)}</div>
                  </div>
                </div>
                {selectedCustomer.topProduct && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                    <Package className="w-3.5 h-3.5" />
                    Top product: <span className="font-medium text-foreground">{selectedCustomer.topProduct}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>First order: {format(new Date(selectedCustomer.firstOrderAt), "MMM d, yyyy")}</span>
                  <span>·</span>
                  <span>Last order: {formatDistanceToNow(new Date(selectedCustomer.lastOrderAt), { addSuffix: true })}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Order History</p>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedCustomer.orders.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center gap-3 rounded-md bg-muted/30 px-2.5 py-1.5 text-sm"
                    >
                      <Link href={`/orders/${o.id}`}>
                        <span className="font-mono text-xs text-primary hover:underline">{o.orderNumber}</span>
                      </Link>
                      <span className="flex-1 truncate text-xs text-muted-foreground">{o.productName || "—"}</span>
                      {getStatusBadge(o.status)}
                      <span className="font-mono text-xs text-right shrink-0">
                        {o.sellPrice != null ? fmt(o.sellPrice * (o.quantity ?? 1)) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center border border-dashed rounded-lg border-border">
              <Users className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Select a customer to see their order history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"orders" | "customers">("orders");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkTracking, setBulkTracking] = useState<string>("");

  const { data: rawOrders, isLoading } = useListOrders<Order[]>(
    statusFilter === "all" ? undefined : { status: statusFilter as OrderStatus }
  );

  const orders = useMemo(() => {
    if (!rawOrders) return rawOrders;
    const q = search.toLowerCase().trim();
    return rawOrders.filter((o) => {
      if (q) {
        const hit =
          o.orderNumber?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.customerEmail?.toLowerCase().includes(q) ||
          o.productName?.toLowerCase().includes(q) ||
          o.trackingNumber?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (fromDate) {
        const created = o.createdAt ? new Date(o.createdAt) : null;
        if (!created || created < new Date(fromDate)) return false;
      }
      if (toDate) {
        const created = o.createdAt ? new Date(o.createdAt) : null;
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (!created || created > end) return false;
      }
      return true;
    });
  }, [rawOrders, search, fromDate, toDate]);

  const createOrder = useCreateOrder();
  const bulkUpdateOrders = useBulkUpdateOrders();

  const handleCreateOrder = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createOrder.mutate(
      {
        data: {
          customerName: formData.get("customerName") as string,
          quantity: Number(formData.get("quantity")),
          costPrice: Number(formData.get("costPrice")) || undefined,
          sellPrice: Number(formData.get("sellPrice")) || undefined,
          shippingAddress: (formData.get("shippingAddress") as string) || undefined,
          status: (formData.get("status") as any) || "pending",
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          setIsSheetOpen(false);
        },
      }
    );
  };

  const handleBulkUpdate = (overrideStatus?: string) => {
    if (selectedIds.size === 0) return;
    const status = overrideStatus || bulkStatus;
    if (!status && !bulkTracking) return;
    bulkUpdateOrders.mutate(
      {
        data: {
          orderIds: Array.from(selectedIds),
          status: status ? (status as any) : undefined,
          trackingNumber: bulkTracking || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          setSelectedIds(new Set());
          setBulkStatus("");
          setBulkTracking("");
        },
      }
    );
  };

  const quickSelect = (status: string) => {
    if (!orders) return;
    const matching = orders.filter(o => o.status === status);
    if (matching.length === 0) return;
    setSelectedIds(new Set(matching.map(o => o.id)));
  };

  const toggleAll = (checked: boolean) => {
    if (checked && orders) setSelectedIds(new Set(orders.map((o) => o.id)));
    else setSelectedIds(new Set());
  };

  const toggleOne = (id: number, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const isAllSelected = !!(orders && orders.length > 0 && selectedIds.size === orders.length);

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/30">
            <button
              onClick={() => setView("orders")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "orders" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              All Orders
            </button>
            <button
              onClick={() => setView("customers")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "customers" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Customer Insights
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => orders && exportOrdersCsv(orders)}
            disabled={!orders || orders.length === 0}
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button data-testid="button-new-order">
                <Plus className="w-4 h-4 mr-2" /> New Order
              </Button>
            </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Create New Order</SheetTitle>
            </SheetHeader>
            <form onSubmit={handleCreateOrder} className="space-y-4 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Name</label>
                <Input name="customerName" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Product Name</label>
                <Input name="productName" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input name="quantity" type="number" min="1" defaultValue="1" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select name="status" defaultValue="pending">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="placed">Placed</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cost Price</label>
                  <Input name="costPrice" type="number" step="0.01" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sell Price</label>
                  <Input name="sellPrice" type="number" step="0.01" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Shipping Address</label>
                <Input name="shippingAddress" />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createOrder.isPending}
                data-testid="button-submit-order"
              >
                {createOrder.isPending ? "Creating..." : "Create Order"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {/* Customer Insights view */}
      {view === "customers" ? (
        <CustomerInsightsPanel />
      ) : (
        <>
          {/* Status filter tabs + search */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders, customers, products…"
                  className="pl-8 h-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-xs">From</span>
                <Input
                  type="date"
                  className="h-9 w-36 text-sm"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <span className="text-xs">To</span>
                <Input
                  type="date"
                  className="h-9 w-36 text-sm"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
                {(search || fromDate || toDate) && (
                  <button
                    onClick={() => { setSearch(""); setFromDate(""); setToDate(""); }}
                    className="text-xs text-primary hover:underline whitespace-nowrap"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              {orders && rawOrders && orders.length !== rawOrders.length && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Showing {orders.length} of {rawOrders.length} orders
                </span>
              )}
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full max-w-3xl">
              <TabsList className="grid grid-cols-6 w-full">
                <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
                <TabsTrigger value="placed" data-testid="tab-placed">Placed</TabsTrigger>
                <TabsTrigger value="shipped" data-testid="tab-shipped">Shipped</TabsTrigger>
                <TabsTrigger value="delivered" data-testid="tab-delivered">Delivered</TabsTrigger>
                <TabsTrigger value="cancelled" data-testid="tab-cancelled">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Quick-select shortcuts */}
          {orders && orders.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" />Quick select:</span>
              {(["pending","placed","shipped"] as const).map(s => {
                const count = orders.filter(o => o.status === s).length;
                if (!count) return null;
                return (
                  <button
                    key={s}
                    onClick={() => quickSelect(s)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors hover:opacity-80 ${STATUS_STYLES[s]}`}
                  >
                    All {s} ({count})
                  </button>
                );
              })}
              {selectedIds.size > 0 && (
                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1">
                  Deselect all
                </button>
              )}
            </div>
          )}

          {/* Orders table */}
          <div className="border rounded-md bg-card flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleAll}
                      data-testid="checkbox-all"
                    />
                  </TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : orders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders?.map((order) => (
                    <TableRow
                      key={order.id}
                      className={selectedIds.has(order.id) ? "bg-muted/50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={(checked) => toggleOne(order.id, !!checked)}
                          data-testid={`checkbox-order-${order.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-primary hover:underline"
                          data-testid={`link-order-${order.id}`}
                        >
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={order.productName || "-"}
                      >
                        {order.productName || "-"}
                      </TableCell>
                      <TableCell className="text-right">{order.quantity || 1}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right text-green-500 font-mono text-sm">
                        {order.profit != null ? `$${order.profit.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {order.trackingNumber || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.createdAt
                          ? format(new Date(order.createdAt), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Bulk fulfillment action bar */}
          {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
              <div className="bg-card border border-border shadow-2xl rounded-2xl px-5 py-3.5 flex flex-col gap-3 min-w-[580px]">
                {/* Top row: count + status breakdown + close */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                      {selectedIds.size}
                    </div>
                    <span className="font-semibold text-sm">
                      {selectedIds.size} order{selectedIds.size > 1 ? "s" : ""} selected
                    </span>
                  </div>
                  {/* Status breakdown of selection */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(["pending","placed","shipped","delivered","cancelled"] as const).map(s => {
                      const count = orders?.filter(o => selectedIds.has(o.id) && o.status === s).length ?? 0;
                      if (!count) return null;
                      return (
                        <span key={s} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[s]}`}>
                          {count} {s}
                        </span>
                      );
                    })}
                  </div>
                  <button onClick={() => setSelectedIds(new Set())} className="text-muted-foreground hover:text-foreground transition-colors ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* One-click fulfillment shortcuts */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap mr-1 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Quick fulfill:
                  </span>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                    onClick={() => handleBulkUpdate("placed")} disabled={bulkUpdateOrders.isPending}>
                    <Send className="w-3 h-3" /> Mark Placed
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                    onClick={() => handleBulkUpdate("shipped")} disabled={bulkUpdateOrders.isPending}>
                    <Truck className="w-3 h-3" /> Mark Shipped
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                    onClick={() => handleBulkUpdate("delivered")} disabled={bulkUpdateOrders.isPending}>
                    <CheckCircle className="w-3 h-3" /> Mark Delivered
                  </Button>
                </div>

                {/* Tracking + custom status row */}
                <div className="flex items-center gap-2 border-t border-border pt-2.5">
                  <Input
                    placeholder="Paste tracking number…"
                    className="h-8 text-xs flex-1"
                    value={bulkTracking}
                    onChange={(e) => setBulkTracking(e.target.value)}
                    data-testid="input-bulk-tracking"
                  />
                  <Select value={bulkStatus} onValueChange={setBulkStatus}>
                    <SelectTrigger className="w-[130px] h-8 text-xs" data-testid="select-bulk-status">
                      <SelectValue placeholder="Set status…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="placed">Placed</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleBulkUpdate()}
                    disabled={(!bulkStatus && !bulkTracking) || bulkUpdateOrders.isPending}
                    data-testid="button-bulk-apply"
                  >
                    {bulkUpdateOrders.isPending ? "Saving…" : "Apply"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
