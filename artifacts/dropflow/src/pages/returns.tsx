import { useState } from "react";
import { RotateCcw, Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListOrders } from "@workspace/api-client-react";

const API = "/api";

function fmt(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function shortDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  requested: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  approved: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  refunded: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

const REASONS = ["Defective product", "Wrong item sent", "Not as described", "Damaged in shipping", "Changed mind", "Duplicate order", "Other"];

interface Return { id: number; returnNumber: string; orderNumber: string; customerName: string; productName: string; quantity: number; reason: string; status: string; refundAmount: string; restocked: number; notes: string; createdAt: string; }

export default function ReturnsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: orders = [] } = useListOrders();
  const { data: returns = [] } = useQuery<Return[]>({ queryKey: ["returns"], queryFn: () => fetch(`${API}/returns`).then(r => r.json()) });

  const [showForm, setShowForm] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [notes, setNotes] = useState("");

  const createMut = useMutation({
    mutationFn: (body: any) => fetch(`${API}/returns`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["returns"] }); setShowForm(false); setOrderId(""); setCustomerName(""); setProductName(""); setQuantity("1"); setReason(""); setRefundAmount(""); setNotes(""); toast({ title: "Return logged" }); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: any) => fetch(`${API}/returns/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["returns"] }); toast({ title: "Return updated" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`${API}/returns/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["returns"] }); toast({ title: "Return deleted" }); },
  });

  const selectedOrder = orders.find(o => String(o.id) === orderId);

  const handleOrderSelect = (val: string) => {
    setOrderId(val);
    const o = orders.find(o => String(o.id) === val);
    if (o) { setCustomerName(o.customerName || ""); setProductName(o.productName || ""); setQuantity(String(o.quantity || 1)); setRefundAmount(o.sellPrice ? String(o.sellPrice) : ""); }
  };

  const handleCreate = () => {
    if (!customerName) { toast({ title: "Customer name is required", variant: "destructive" }); return; }
    createMut.mutate({ orderId: orderId ? Number(orderId) : null, orderNumber: selectedOrder?.orderNumber, customerName, productName, quantity: Number(quantity), reason, refundAmount: refundAmount || null, notes });
  };

  const totalRefunded = returns.filter(r => r.status === "refunded").reduce((s, r) => s + Number(r.refundAmount || 0), 0);
  const pending = returns.filter(r => r.status === "requested" || r.status === "approved").length;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><RotateCcw className="w-6 h-6 text-primary" /> Returns & Refunds</h1>
          <p className="text-muted-foreground text-sm mt-1">Track customer returns and manage refunds.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(x => !x)}><Plus className="w-4 h-4 mr-1.5" /> Log Return</Button>
      </div>

      {returns.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="pt-4 pb-3"><div className="text-xs text-muted-foreground">Pending</div><div className="text-2xl font-bold text-yellow-400">{pending}</div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="text-xs text-muted-foreground">Total Returns</div><div className="text-2xl font-bold">{returns.length}</div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="text-xs text-muted-foreground">Amount Refunded</div><div className="text-2xl font-bold text-red-400">{fmt(totalRefunded)}</div></CardContent></Card>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Log New Return</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Linked Order (optional)</Label>
                <Select value={orderId} onValueChange={handleOrderSelect}>
                  <SelectTrigger><SelectValue placeholder="Select order…" /></SelectTrigger>
                  <SelectContent>{orders.filter(o => o.status !== "cancelled").map(o => <SelectItem key={o.id} value={String(o.id)}>{o.orderNumber} — {o.customerName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Customer Name</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Jane Smith" />
              </div>
              <div className="space-y-1.5">
                <Label>Product</Label>
                <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Product name" />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" min={1} value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
                  <SelectContent>{REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Refund Amount</Label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span><Input className="pl-7" type="number" step="0.01" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="0.00" /></div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes…" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createMut.isPending}>Log Return</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {returns.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <RotateCcw className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium">No returns logged</p>
          <p className="text-sm text-muted-foreground mt-1">Log a return when a customer sends a product back.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {returns.map(r => (
            <Card key={r.id}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-primary">{r.returnNumber}</span>
                      <Badge className={`text-xs border ${STATUS_STYLES[r.status] || STATUS_STYLES.requested}`}>{r.status}</Badge>
                      {r.orderNumber && <span className="text-xs text-muted-foreground">Order {r.orderNumber}</span>}
                    </div>
                    <div className="text-sm mt-0.5">{r.customerName} {r.productName && <span className="text-muted-foreground">· {r.productName}</span>}</div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      {r.reason && <span>{r.reason}</span>}
                      {r.refundAmount && <span className="text-red-400 font-medium">Refund: {fmt(r.refundAmount)}</span>}
                      <span>{shortDate(r.createdAt)}</span>
                    </div>
                    {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {r.status === "requested" && (
                      <><Button size="sm" variant="outline" className="text-xs h-7 text-green-400 border-green-500/30" onClick={() => updateMut.mutate({ id: r.id, status: "approved" })}><CheckCircle className="w-3 h-3 mr-1" />Approve</Button>
                      <Button size="sm" variant="outline" className="text-xs h-7 text-red-400 border-red-500/30" onClick={() => updateMut.mutate({ id: r.id, status: "rejected" })}><XCircle className="w-3 h-3 mr-1" />Reject</Button></>
                    )}
                    {r.status === "approved" && (
                      <Button size="sm" variant="outline" className="text-xs h-7 text-green-400 border-green-500/30" onClick={() => updateMut.mutate({ id: r.id, status: "refunded" })}><CheckCircle className="w-3 h-3 mr-1" />Mark Refunded</Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate(r.id)}><Trash2 className="w-4 h-4" /></Button>
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
