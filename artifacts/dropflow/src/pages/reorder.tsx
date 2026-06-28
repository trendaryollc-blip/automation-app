import { useState, useMemo } from "react";
import {
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Package,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useListProducts,
  useListSuppliers,
  useUpdateProduct,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

type ReorderRow = {
  id: number;
  name: string;
  status: string;
  stockQuantity: number;
  stockThreshold: number;
  deficit: number;
  costPrice: number | null;
  supplierName: string;
  supplierId: number | null;
};

function SupplierGroup({
  supplierName,
  supplierId,
  rows,
  onMarked,
}: {
  supplierName: string;
  supplierId: number | null;
  rows: ReorderRow[];
  onMarked: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [quantities, setQuantities] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      rows.map((r) => [
        r.id,
        String(Math.max(r.deficit, Math.ceil(r.stockThreshold * 1.2))),
      ]),
    ),
  );
  const [ordered, setOrdered] = useState<Record<number, boolean>>({});
  const updateProduct = useUpdateProduct();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const totalCost = rows.reduce((sum, r) => {
    if (ordered[r.id]) return sum;
    const qty = parseInt(quantities[r.id] ?? "0") || 0;
    return sum + qty * (r.costPrice ?? 0);
  }, 0);

  const pendingCount = rows.filter((r) => !ordered[r.id]).length;

  const handleMarkOrdered = async (row: ReorderRow) => {
    const reorderQty = parseInt(quantities[row.id] ?? "0") || 0;
    if (reorderQty <= 0) {
      toast({
        title: "Enter a valid reorder quantity",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateProduct.mutateAsync({
        id: row.id,
        data: { stockQuantity: row.stockQuantity + reorderQty },
      });
      setOrdered((o) => ({ ...o, [row.id]: true }));
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      toast({ title: `Restocked: ${row.name} +${reorderQty} units` });
      onMarked();
    } catch {
      toast({ title: "Failed to update stock", variant: "destructive" });
    }
  };

  const handleMarkAllOrdered = async () => {
    const pending = rows.filter((r) => !ordered[r.id]);
    for (const row of pending) {
      const reorderQty = parseInt(quantities[row.id] ?? "0") || 0;
      if (reorderQty <= 0) continue;
      try {
        await updateProduct.mutateAsync({
          id: row.id,
          data: { stockQuantity: row.stockQuantity + reorderQty },
        });
        setOrdered((o) => ({ ...o, [row.id]: true }));
      } catch {
        /* continue */
      }
    }
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    toast({ title: `All items in ${supplierName} marked as ordered` });
    onMarked();
  };

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between gap-3">
          <button
            className="flex items-center gap-2 flex-1 text-left"
            onClick={() => setOpen((x) => !x)}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="font-semibold">{supplierName}</span>
              {supplierId && (
                <Link
                  href={`/suppliers/${supplierId}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs text-primary underline underline-offset-2 hover:opacity-80">
                    view supplier
                  </span>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Badge variant="outline" className="text-xs">
                {pendingCount} item{pendingCount !== 1 ? "s" : ""} pending
              </Badge>
              {pendingCount < rows.length && (
                <Badge
                  variant="outline"
                  className="text-xs border-green-500/30 text-green-400 bg-green-500/10"
                >
                  {rows.length - pendingCount} ordered
                </Badge>
              )}
            </div>
            {open ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
            )}
          </button>
          {open && pendingCount > 1 && (
            <Button size="sm" variant="outline" onClick={handleMarkAllOrdered}>
              Mark All Ordered
            </Button>
          )}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left pb-2 pr-4">Product</th>
                  <th className="text-right pb-2 pr-3">Stock</th>
                  <th className="text-right pb-2 pr-3">Threshold</th>
                  <th className="text-right pb-2 pr-3">Deficit</th>
                  <th className="text-right pb-2 pr-3">Reorder Qty</th>
                  <th className="text-right pb-2 pr-3">Unit Cost</th>
                  <th className="text-right pb-2 pr-3">Total Cost</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => {
                  const qty = parseInt(quantities[row.id] ?? "0") || 0;
                  const totalCostRow = qty * (row.costPrice ?? 0);
                  const isOrdered = ordered[row.id];
                  return (
                    <tr key={row.id} className={isOrdered ? "opacity-40" : ""}>
                      <td className="py-2.5 pr-4">
                        <Link href={`/products/${row.id}`}>
                          <span className="font-medium hover:underline cursor-pointer">
                            {row.name}
                          </span>
                        </Link>
                        <div className="text-xs text-muted-foreground capitalize">
                          {row.status}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <span className="font-mono text-orange-400 font-semibold">
                          {row.stockQuantity}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right text-muted-foreground font-mono">
                        {row.stockThreshold}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <Badge
                          variant="outline"
                          className="text-xs border-red-500/30 text-red-400 bg-red-500/10 font-mono"
                        >
                          -{row.deficit}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        {isOrdered ? (
                          <span className="text-muted-foreground font-mono">
                            {qty}
                          </span>
                        ) : (
                          <Input
                            type="number"
                            min="1"
                            className="w-20 h-7 text-right text-sm font-mono ml-auto"
                            value={quantities[row.id] ?? ""}
                            onChange={(e) =>
                              setQuantities((q) => ({
                                ...q,
                                [row.id]: e.target.value,
                              }))
                            }
                          />
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-muted-foreground">
                        {row.costPrice != null ? fmt(row.costPrice) : "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-semibold">
                        {row.costPrice != null ? fmt(totalCostRow) : "—"}
                      </td>
                      <td className="py-2.5 text-right">
                        {isOrdered ? (
                          <span className="flex items-center justify-end gap-1 text-green-400 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ordered
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleMarkOrdered(row)}
                            disabled={updateProduct.isPending}
                          >
                            Mark Ordered
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {pendingCount > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td colSpan={6} className="pt-3 text-sm font-semibold">
                      Estimated Order Cost
                    </td>
                    <td className="pt-3 text-right font-bold text-primary">
                      {fmt(totalCost)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function ReorderPage() {
  const { data: products = [], refetch } = useListProducts();
  const { data: suppliers = [] } = useListSuppliers();

  const supplierMap = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s])),
    [suppliers],
  );

  const lowStockRows: ReorderRow[] = useMemo(() => {
    return products
      .filter(
        (p) =>
          p.stockQuantity != null &&
          p.stockThreshold != null &&
          p.stockQuantity < p.stockThreshold,
      )
      .map((p) => {
        const supplier =
          p.supplierId != null ? supplierMap.get(p.supplierId) : null;
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          stockQuantity: p.stockQuantity!,
          stockThreshold: p.stockThreshold!,
          deficit: p.stockThreshold! - p.stockQuantity!,
          costPrice: p.costPrice ?? null,
          supplierName: supplier?.name ?? "No Supplier Assigned",
          supplierId: p.supplierId ?? null,
        };
      })
      .sort((a, b) => b.deficit - a.deficit);
  }, [products, supplierMap]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { supplierId: number | null; rows: ReorderRow[] }
    >();
    for (const row of lowStockRows) {
      const key = row.supplierName;
      if (!map.has(key)) map.set(key, { supplierId: row.supplierId, rows: [] });
      map.get(key)!.rows.push(row);
    }
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  }, [lowStockRows]);

  const totalProducts = lowStockRows.length;
  const totalDeficit = lowStockRows.reduce((s, r) => s + r.deficit, 0);
  const totalEstimatedCost = lowStockRows.reduce((s, r) => {
    const qty = Math.max(r.deficit, Math.ceil(r.stockThreshold * 1.2));
    return s + qty * (r.costPrice ?? 0);
  }, 0);
  const suppliersAffected = grouped.length;

  if (lowStockRows.length === 0) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Reorder Suggestions
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Purchase order drafts for products running below their stock
            threshold.
          </p>
        </div>
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-400 mb-3" />
          <p className="font-semibold text-lg">All stocked up</p>
          <p className="text-sm text-muted-foreground mt-1">
            No products are below their threshold right now.
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Set a stock threshold on any product to start tracking it.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Reorder Suggestions
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Purchase order drafts for products running below their stock
            threshold.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Low Stock Items
            </div>
            <div className="text-2xl font-bold text-orange-400">
              {totalProducts}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <Package className="w-3.5 h-3.5" />
              Suppliers Affected
            </div>
            <div className="text-2xl font-bold">{suppliersAffected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              Total Units Needed
            </div>
            <div className="text-2xl font-bold">{totalDeficit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              Est. Restock Cost
            </div>
            <div className="text-2xl font-bold text-primary">
              {fmt(totalEstimatedCost)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase order groups */}
      <div className="space-y-4">
        {grouped.map((g) => (
          <SupplierGroup
            key={g.name}
            supplierName={g.name}
            supplierId={g.supplierId}
            rows={g.rows}
            onMarked={refetch}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Reorder quantities default to the deficit plus a 20% buffer. Adjust any
        quantity before marking as ordered. Marking as ordered adds the quantity
        to the product's current stock.
      </p>
    </div>
  );
}
