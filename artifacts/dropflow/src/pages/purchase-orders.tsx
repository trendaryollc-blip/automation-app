import { useState } from "react";
import {
  ShoppingBag,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  Send,
  CheckCircle,
  Archive,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useListSuppliers, useListProducts } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API = "/api";

function fmt(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-US", {
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
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  confirmed: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  received: "bg-green-500/10 text-green-400 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_FLOW = ["draft", "sent", "confirmed", "received"];

interface POItem {
  productName: string;
  productId?: number;
  quantity: number;
  unitCost: string;
}
interface PO {
  id: number;
  poNumber: string;
  supplierName: string;
  status: string;
  totalCost: string;
  notes: string;
  expectedAt: string;
  createdAt: string;
}

export default function PurchaseOrdersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: suppliers = [] } = useListSuppliers();
  const { data: products = [] } = useListProducts();
  const { data: pos = [] } = useQuery<PO[]>({
    queryKey: ["purchase-orders"],
    queryFn: () => fetch(`${API}/purchase-orders`).then((r) => r.json()),
  });

  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [items, setItems] = useState<POItem[]>([
    { productName: "", quantity: 1, unitCost: "" },
  ]);

  const createMut = useMutation({
    mutationFn: (body: any) =>
      fetch(`${API}/purchase-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      setShowForm(false);
      setSupplierId("");
      setNotes("");
      setExpectedAt("");
      setItems([{ productName: "", quantity: 1, unitCost: "" }]);
      toast({ title: "Purchase order created" });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: any) =>
      fetch(`${API}/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Status updated" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      fetch(`${API}/purchase-orders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Purchase order deleted" });
    },
  });

  const supplier = suppliers.find((s) => String(s.id) === supplierId);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { productName: "", quantity: 1, unitCost: "" },
    ]);
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: keyof POItem, val: any) =>
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)),
    );

  const totalCost = items.reduce(
    (s, i) => s + Number(i.unitCost || 0) * Number(i.quantity || 1),
    0,
  );

  const handleCreate = () => {
    if (!supplierId) {
      toast({ title: "Select a supplier", variant: "destructive" });
      return;
    }
    createMut.mutate({
      supplierId: Number(supplierId),
      supplierName: supplier?.name,
      notes,
      expectedAt: expectedAt || null,
      items,
    });
  };

  const nextStatus = (status: string) =>
    STATUS_FLOW[STATUS_FLOW.indexOf(status) + 1];

  const draft = pos.filter((p) => p.status === "draft").length;
  const sent = pos.filter((p) => p.status === "sent").length;
  const confirmed = pos.filter((p) => p.status === "confirmed").length;
  const received = pos.filter((p) => p.status === "received").length;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" /> Purchase Orders
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and track orders sent to your suppliers.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((x) => !x)}>
          <Plus className="w-4 h-4 mr-1.5" /> New PO
        </Button>
      </div>

      {pos.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            ["Draft", draft, "text-gray-400"],
            ["Sent", sent, "text-blue-400"],
            ["Confirmed", confirmed, "text-purple-400"],
            ["Received", received, "text-green-400"],
          ].map(([label, count, color]) => (
            <Card key={label as string}>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className={`text-2xl font-bold ${color}`}>{count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New Purchase Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier…" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={expectedAt}
                  onChange={(e) => setExpectedAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes</Label>
                <Input
                  placeholder="e.g. Expedite shipping if possible"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button variant="ghost" size="sm" onClick={addItem}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              </div>
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Select
                    value={
                      item.productId ? String(item.productId) : "__custom__"
                    }
                    onValueChange={(val) => {
                      if (val === "__custom__") {
                        updateItem(i, "productId", undefined);
                      } else {
                        const p = products.find((p) => String(p.id) === val);
                        updateItem(i, "productId", Number(val));
                        updateItem(i, "productName", p?.name || "");
                        updateItem(
                          i,
                          "unitCost",
                          p?.costPrice ? String(p.costPrice) : "",
                        );
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Product…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__custom__">Custom item…</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!item.productId && (
                    <Input
                      className="flex-1"
                      placeholder="Item name"
                      value={item.productName}
                      onChange={(e) =>
                        updateItem(i, "productName", e.target.value)
                      }
                    />
                  )}
                  <Input
                    className="w-20"
                    type="number"
                    placeholder="Qty"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(i, "quantity", Number(e.target.value))
                    }
                  />
                  <div className="relative w-28">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      className="pl-7"
                      type="number"
                      placeholder="Cost"
                      value={item.unitCost}
                      onChange={(e) =>
                        updateItem(i, "unitCost", e.target.value)
                      }
                    />
                  </div>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive"
                      onClick={() => removeItem(i)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="text-right text-sm font-semibold">
                Total: {fmt(totalCost)}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createMut.isPending}>
                Create Purchase Order
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium">No purchase orders yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first PO to track orders sent to suppliers.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pos.map((po) => (
            <Card key={po.id}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-primary">
                        {po.poNumber}
                      </span>
                      <Badge
                        className={`text-xs border ${STATUS_STYLES[po.status] || STATUS_STYLES.draft}`}
                      >
                        {po.status}
                      </Badge>
                      {po.supplierName && (
                        <span className="text-sm text-muted-foreground">
                          {po.supplierName}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>Created {shortDate(po.createdAt)}</span>
                      {po.expectedAt && (
                        <span>Expected {shortDate(po.expectedAt)}</span>
                      )}
                      {po.totalCost && (
                        <span className="font-medium text-foreground">
                          {fmt(po.totalCost)}
                        </span>
                      )}
                    </div>
                    {po.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {po.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {nextStatus(po.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() =>
                          updateMut.mutate({
                            id: po.id,
                            status: nextStatus(po.status),
                          })
                        }
                      >
                        {nextStatus(po.status) === "sent" && (
                          <>
                            <Send className="w-3 h-3 mr-1" />
                            Mark Sent
                          </>
                        )}
                        {nextStatus(po.status) === "confirmed" && (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Confirm
                          </>
                        )}
                        {nextStatus(po.status) === "received" && (
                          <>
                            <Archive className="w-3 h-3 mr-1" />
                            Received
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        setExpanded(expanded === po.id ? null : po.id)
                      }
                    >
                      {expanded === po.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteMut.mutate(po.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {expanded === po.id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <POItems poId={po.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function POItems({ poId }: { poId: number }) {
  const { data } = useQuery<{ items: any[] }>({
    queryKey: ["purchase-orders", poId],
    queryFn: () =>
      fetch(`${API}/purchase-orders/${poId}`).then((r) => r.json()),
  });
  const items = data?.items ?? [];
  if (items.length === 0)
    return <p className="text-xs text-muted-foreground">No line items.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
          <th className="text-left pb-1.5">Product</th>
          <th className="text-right pb-1.5">Qty</th>
          <th className="text-right pb-1.5">Unit Cost</th>
          <th className="text-right pb-1.5">Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={i} className="border-b border-border last:border-0">
            <td className="py-1.5">{item.productName}</td>
            <td className="py-1.5 text-right">{item.quantity}</td>
            <td className="py-1.5 text-right">
              {item.unitCost ? `$${Number(item.unitCost).toFixed(2)}` : "—"}
            </td>
            <td className="py-1.5 text-right font-medium">
              {item.totalCost ? `$${Number(item.totalCost).toFixed(2)}` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
