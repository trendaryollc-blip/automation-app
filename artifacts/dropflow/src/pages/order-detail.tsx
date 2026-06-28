import { useParams } from "wouter";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, Printer, Package, User, MapPin, Hash, DollarSign, Truck, CheckCircle, Send, ShoppingCart, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadSettings } from "@/pages/settings";

const API = "/api";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  placed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  shipped: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  delivered: "bg-green-500/10 text-green-400 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const EVENT_ICONS: Record<string, any> = {
  created: ShoppingCart, placed: Send, shipped: Truck, delivered: CheckCircle, cancelled: XCircle, updated: AlertCircle,
};

function fmt(n: number | string | null | undefined, currency = "USD") {
  return Number(n ?? 0).toLocaleString("en-US", { style: "currency", currency, minimumFractionDigits: 2 });
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface TimelineEvent { id: number; event: string; fromStatus?: string; toStatus?: string; note?: string; createdAt: string; }

export default function OrderDetail() {
  const { id } = useParams();
  const orderId = parseInt(id || "0");
  const settings = loadSettings();
  const { data: order, isLoading } = useGetOrder(orderId, { query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) } });
  const { data: timeline = [] } = useQuery<TimelineEvent[]>({
    queryKey: ["order-timeline", orderId],
    queryFn: () => fetch(`${API}/orders/${orderId}/timeline`).then(r => r.json()),
    enabled: !!orderId,
  });
  const [showPrint, setShowPrint] = useState(false);

  if (isLoading) return <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>;
  if (!order) return <div className="p-8">Order not found</div>;

  const margin = order.sellPrice && order.costPrice
    ? ((Number(order.sellPrice) - Number(order.costPrice)) / Number(order.sellPrice)) * 100
    : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{order.orderNumber}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Created {fmtDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-sm border px-3 py-1 ${STATUS_STYLES[order.status] || STATUS_STYLES.pending}`}>{order.status}</Badge>
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-1.5" />Print / Packing Slip</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Customer */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><User className="w-4 h-4 text-primary" />Customer</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{order.customerName}</p>
            {order.customerEmail && <p className="text-muted-foreground">{order.customerEmail}</p>}
            {order.shippingAddress && (
              <div className="flex gap-1 mt-2 text-muted-foreground"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{order.shippingAddress}</span></div>
            )}
          </CardContent>
        </Card>

        {/* Product */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Package className="w-4 h-4 text-primary" />Product</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{order.productName || "—"}</p>
            {order.supplierName && <p className="text-muted-foreground">Supplier: {order.supplierName}</p>}
            <p className="text-muted-foreground">Qty: <span className="text-foreground font-medium">{order.quantity}</span></p>
            {order.trackingNumber && (
              <div className="flex gap-1 mt-1 text-muted-foreground"><Truck className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="font-mono text-xs">{order.trackingNumber}</span></div>
            )}
          </CardContent>
        </Card>

        {/* Financials */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-primary" />Financials</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Sell Price</span><span className="font-semibold">{fmt(order.sellPrice, settings.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cost Price</span><span>{fmt(order.costPrice, settings.currency)}</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">Profit</span><span className={`font-bold ${Number(order.profit) > 0 ? "text-green-400" : "text-red-400"}`}>{fmt(order.profit, settings.currency)}</span></div>
            {margin != null && <div className="flex justify-between"><span className="text-muted-foreground">Margin</span><span className={`font-medium ${margin >= 30 ? "text-green-400" : margin >= 15 ? "text-yellow-400" : "text-red-400"}`}>{margin.toFixed(1)}%</span></div>}
          </CardContent>
        </Card>

        {/* Order Info */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Hash className="w-4 h-4 text-primary" />Order Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Order #</span><span className="font-mono">{order.orderNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={`text-xs border ${STATUS_STYLES[order.status]}`}>{order.status}</Badge></div>
            {order.placedAt && <div className="flex justify-between"><span className="text-muted-foreground">Placed</span><span>{fmtDate(order.placedAt)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Updated</span><span>{fmtDate(order.updatedAt)}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Timeline */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" />Order Timeline</CardTitle></CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timeline events yet. Status changes will appear here automatically.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {timeline.map((event, i) => {
                  const Icon = EVENT_ICONS[event.toStatus || event.event] || AlertCircle;
                  return (
                    <div key={event.id} className="flex gap-3 relative">
                      <div className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center shrink-0 z-10">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm capitalize">{event.event}</span>
                          {event.fromStatus && event.toStatus && (
                            <span className="text-xs text-muted-foreground">{event.fromStatus} → {event.toStatus}</span>
                          )}
                        </div>
                        {event.note && <p className="text-xs text-muted-foreground mt-0.5">{event.note}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(event.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Packing Slip — print only */}
      <div className="hidden print:block border-2 border-gray-800 p-8 rounded-lg space-y-6 text-black bg-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{loadSettings().storeName}</h2>
            <p className="text-gray-500 text-sm">Packing Slip</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{order.orderNumber}</p>
            <p className="text-gray-500 text-sm">{fmtDate(order.createdAt)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 border-t pt-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Ship To</p>
            <p className="font-semibold">{order.customerName}</p>
            {order.customerEmail && <p className="text-sm text-gray-600">{order.customerEmail}</p>}
            {order.shippingAddress && <p className="text-sm text-gray-600 mt-1">{order.shippingAddress}</p>}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Order Details</p>
            <p className="text-sm">Status: <strong>{order.status}</strong></p>
            {order.trackingNumber && <p className="text-sm">Tracking: <strong>{order.trackingNumber}</strong></p>}
          </div>
        </div>
        <table className="w-full border-t pt-4 text-sm">
          <thead><tr className="border-b"><th className="text-left py-2">Product</th><th className="text-center py-2">Qty</th><th className="text-right py-2">Price</th></tr></thead>
          <tbody><tr><td className="py-3">{order.productName}</td><td className="py-3 text-center">{order.quantity}</td><td className="py-3 text-right font-semibold">{fmt(order.sellPrice, settings.currency)}</td></tr></tbody>
          <tfoot><tr className="border-t"><td colSpan={2} className="pt-3 text-right font-bold">Total</td><td className="pt-3 text-right font-bold">{fmt(Number(order.sellPrice) * Number(order.quantity), settings.currency)}</td></tr></tfoot>
        </table>
        <p className="text-center text-xs text-gray-400 border-t pt-4">Thank you for your order!</p>
      </div>
    </div>
  );
}
