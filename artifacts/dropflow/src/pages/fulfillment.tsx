import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Package,
  Truck,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ListChecks,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type QueueItem = {
  id: number;
  orderId: number;
  orderNumber: string;
  customerName: string;
  productName: string;
  quantity: number;
  sellPrice: number | null;
  supplierId: number | null;
  supplierName: string | null;
  estimatedCost: number | null;
  estimatedMargin: number | null;
  matchReason: string | null;
  status: string;
  autoProcessed: boolean;
  storeSource: string | null;
  purchaseOrderId: number | null;
  rejectionReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
};

type Stats = {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
  totalRevenue: number;
  totalCost: number;
};

function statusBadge(status: string) {
  if (status === "pending_approval")
    return (
      <Badge
        variant="secondary"
        className="gap-1 text-amber-400 border-amber-400/30 bg-amber-400/10"
      >
        <Clock className="w-3 h-3" /> Pending
      </Badge>
    );
  if (status === "approved")
    return (
      <Badge
        variant="default"
        className="gap-1 bg-green-600 hover:bg-green-600"
      >
        <CheckCircle className="w-3 h-3" /> Approved
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="w-3 h-3" /> Rejected
      </Badge>
    );
  return <Badge variant="outline">{status}</Badge>;
}

export default function FulfillmentPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [filter, setFilter] = useState<
    "all" | "pending_approval" | "approved" | "rejected"
  >("pending_approval");

  const { data: stats } = useQuery<Stats>({
    queryKey: ["fulfillment-stats"],
    queryFn: () => fetch(`${BASE}/api/fulfillment/stats`).then((r) => r.json()),
    refetchInterval: 10000,
  });

  const { data: queue = [], isLoading } = useQuery<QueueItem[]>({
    queryKey: ["fulfillment-queue"],
    queryFn: () => fetch(`${BASE}/api/fulfillment/queue`).then((r) => r.json()),
    refetchInterval: 10000,
  });

  const approve = useMutation({
    mutationFn: (id: number) =>
      fetch(`${BASE}/api/fulfillment/approve/${id}`, { method: "POST" }).then(
        (r) => r.json(),
      ),
    onSuccess: (data) => {
      if (!data.success) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      qc.invalidateQueries({ queryKey: ["fulfillment-queue"] });
      qc.invalidateQueries({ queryKey: ["fulfillment-stats"] });
      toast({
        title: "✅ Approved!",
        description: `Purchase order PO-${String(data.poId).padStart(4, "0")} created.`,
      });
    },
  });

  const approveAll = useMutation({
    mutationFn: () =>
      fetch(`${BASE}/api/fulfillment/approve-all`, { method: "POST" }).then(
        (r) => r.json(),
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["fulfillment-queue"] });
      qc.invalidateQueries({ queryKey: ["fulfillment-stats"] });
      toast({
        title: `✅ Approved ${data.approved} orders`,
        description: `${data.approved} purchase orders created.`,
      });
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      fetch(`${BASE}/api/fulfillment/reject/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fulfillment-queue"] });
      qc.invalidateQueries({ queryKey: ["fulfillment-stats"] });
      setRejectingId(null);
      setRejectReason("");
      toast({ title: "Order rejected" });
    },
  });

  const filtered = queue.filter((i) => filter === "all" || i.status === filter);
  const pendingCount = queue.filter(
    (i) => i.status === "pending_approval",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-primary" /> Fulfillment Queue
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Orders auto-processed from your store — review and approve to create
            purchase orders
          </p>
        </div>
        {pendingCount > 0 && (
          <Button
            onClick={() => approveAll.mutate()}
            disabled={approveAll.isPending}
            className="gap-1.5 bg-green-600 hover:bg-green-700"
          >
            {approveAll.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5" />
            )}
            Approve All ({pendingCount})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Pending",
            value: stats?.pending ?? 0,
            icon: Clock,
            color: "text-amber-400",
          },
          {
            label: "Approved",
            value: stats?.approved ?? 0,
            icon: CheckCircle,
            color: "text-green-500",
          },
          {
            label: "Rejected",
            value: stats?.rejected ?? 0,
            icon: XCircle,
            color: "text-destructive",
          },
          {
            label: "Total Revenue",
            value: `$${(stats?.totalRevenue ?? 0).toFixed(2)}`,
            icon: TrendingUp,
            color: "text-primary",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 shrink-0 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex gap-3 items-start">
          <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-primary">How it works: </span>
            <span className="text-muted-foreground">
              When an order arrives from Trendaryo (or any connected store),
              DropFlow instantly matches the best supplier, estimates cost &
              margin, and adds it here. You review and click{" "}
              <strong className="text-foreground">Approve</strong> — a Purchase
              Order is created automatically and the order status updates to
              Processing.
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {(["pending_approval", "all", "approved", "rejected"] as const).map(
          (f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="capitalize text-xs"
            >
              {f === "pending_approval"
                ? `Pending (${stats?.pending ?? 0})`
                : f === "all"
                  ? `All (${stats?.total ?? 0})`
                  : f === "approved"
                    ? `Approved (${stats?.approved ?? 0})`
                    : `Rejected (${stats?.rejected ?? 0})`}
            </Button>
          ),
        )}
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground text-sm flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading queue…
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <ListChecks className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">
            {filter === "pending_approval"
              ? "No orders pending approval"
              : "No items in this category"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Orders from connected stores appear here automatically
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((item) => {
          const isOpen = expanded === item.id;
          const isRejecting = rejectingId === item.id;
          const margin = item.estimatedMargin;

          return (
            <Card
              key={item.id}
              className={
                item.status === "pending_approval" ? "border-amber-400/20" : ""
              }
            >
              <CardContent className="p-0">
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer select-none"
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">
                        {item.orderNumber}
                      </span>
                      {statusBadge(item.status)}
                      {item.autoProcessed && (
                        <Badge variant="outline" className="text-xs gap-1 py-0">
                          <Zap className="w-2.5 h-2.5" /> Auto
                        </Badge>
                      )}
                      {item.storeSource && item.storeSource !== "manual" && (
                        <Badge variant="outline" className="text-xs py-0">
                          {item.storeSource}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" /> {item.productName} ×
                        {item.quantity}
                      </span>
                      {item.supplierName && (
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {item.supplierName}
                        </span>
                      )}
                      {item.sellPrice != null && (
                        <span>Sell: ${item.sellPrice.toFixed(2)}</span>
                      )}
                      {item.estimatedCost != null && (
                        <span>Cost: ${item.estimatedCost.toFixed(2)}</span>
                      )}
                      {margin != null && (
                        <span
                          className={
                            margin >= 40
                              ? "text-green-500 font-medium"
                              : margin >= 20
                                ? "text-amber-400"
                                : "text-destructive"
                          }
                        >
                          Margin: {margin}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.status === "pending_approval" && (
                      <>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700 gap-1"
                          onClick={() => approve.mutate(item.id)}
                          disabled={approve.isPending}
                        >
                          <CheckCircle className="w-3 h-3" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                          onClick={() => {
                            setRejectingId(item.id);
                            setExpanded(item.id);
                          }}
                        >
                          <XCircle className="w-3 h-3" /> Reject
                        </Button>
                      </>
                    )}
                    {item.status === "approved" && item.purchaseOrderId && (
                      <span className="text-xs text-muted-foreground">
                        PO-{String(item.purchaseOrderId).padStart(4, "0")}
                      </span>
                    )}
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Customer</span>
                        <p className="font-medium mt-0.5">
                          {item.customerName}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Product</span>
                        <p className="font-medium mt-0.5">{item.productName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quantity</span>
                        <p className="font-medium mt-0.5">{item.quantity}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Matched Supplier
                        </span>
                        <p className="font-medium mt-0.5">
                          {item.supplierName ?? "None"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Est. Cost</span>
                        <p className="font-medium mt-0.5">
                          {item.estimatedCost != null
                            ? `$${item.estimatedCost.toFixed(2)}`
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Est. Margin
                        </span>
                        <p
                          className={`font-medium mt-0.5 ${margin != null && margin >= 40 ? "text-green-500" : margin != null && margin >= 20 ? "text-amber-400" : "text-destructive"}`}
                        >
                          {margin != null ? `${margin}%` : "—"}
                        </p>
                      </div>
                    </div>
                    {item.matchReason && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                        <span>
                          <strong className="text-foreground">
                            Match reason:
                          </strong>{" "}
                          {item.matchReason}
                        </span>
                      </div>
                    )}
                    {item.status === "approved" && (
                      <div className="text-xs text-green-500 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approved{" "}
                        {item.approvedAt
                          ? new Date(item.approvedAt).toLocaleString()
                          : ""}{" "}
                        · PO #{item.purchaseOrderId}
                      </div>
                    )}
                    {item.status === "rejected" && (
                      <div className="text-xs text-destructive flex items-start gap-1.5">
                        <XCircle className="w-3.5 h-3.5 mt-0.5" />
                        <span>
                          Rejected{" "}
                          {item.rejectedAt
                            ? new Date(item.rejectedAt).toLocaleString()
                            : ""}
                          {item.rejectionReason
                            ? ` — ${item.rejectionReason}`
                            : ""}
                        </span>
                      </div>
                    )}
                    {isRejecting && item.status === "pending_approval" && (
                      <div className="space-y-2">
                        <input
                          className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm"
                          placeholder="Reason for rejection (optional)…"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() =>
                              reject.mutate({
                                id: item.id,
                                reason: rejectReason,
                              })
                            }
                            disabled={reject.isPending}
                          >
                            Confirm Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
