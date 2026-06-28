import {
  useListProducts,
  useCreateProduct,
  getListProductsQueryKey,
  type Product,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
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
import { useState } from "react";
import { Search, Plus, Download, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { loadSettings } from "@/pages/settings";

function exportProductsCsv(products: Product[]) {
  const headers = [
    "name",
    "category",
    "niche",
    "status",
    "costPrice",
    "sellPrice",
    "margin",
    "stockQuantity",
    "stockThreshold",
    "description",
    "sourceUrl",
    "notes",
  ];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const rows = products.map((p) =>
    [
      p.name,
      p.category,
      p.niche,
      p.status,
      p.costPrice,
      p.sellPrice,
      p.margin,
      p.stockQuantity,
      p.stockThreshold,
      p.description,
      p.sourceUrl,
      p.notes,
    ]
      .map(escape)
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dropflow-products-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Products() {
  const { data: products, isLoading } = useListProducts<Product[]>();
  const settings = loadSettings();
  const createProduct = useCreateProduct();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const category = formData.get("category") as string;

    if (!name) return;

    createProduct.mutate(
      {
        data: {
          name,
          category,
          status: "hunting",
          costPrice: 0,
          sellPrice: 0,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListProductsQueryKey(),
          });
          setIsDialogOpen(false);
        },
      },
    );
  };

  const filteredProducts = products?.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Hunting</h1>
          <p className="text-muted-foreground mt-1">
            Catalog and research tracked products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => products && exportProductsCsv(products)}
            disabled={!products || products.length === 0}
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product Name</label>
                  <Input
                    name="name"
                    required
                    placeholder="Wireless Earbuds..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Input name="category" placeholder="Electronics" />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createProduct.isPending}
                >
                  {createProduct.isPending ? "Adding..." : "Add Product"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md bg-card flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Sell</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts?.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/products/${product.id}`}
                    className="hover:underline flex items-center gap-2"
                  >
                    {product.name}
                  </Link>
                </TableCell>
                <TableCell>{product.category || "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      product.status === "listed"
                        ? "default"
                        : product.status === "researching"
                          ? "secondary"
                          : product.status === "archived"
                            ? "destructive"
                            : "outline"
                    }
                  >
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  ${product.costPrice?.toFixed(2) || "0.00"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  ${product.sellPrice?.toFixed(2) || "0.00"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  <span
                    className={`inline-flex items-center gap-1 ${product.margin != null && settings.marginAlertsEnabled && product.margin < settings.marginAlertThresholdPct ? "text-red-400" : "text-green-500"}`}
                  >
                    {product.margin != null &&
                      settings.marginAlertsEnabled &&
                      product.margin < settings.marginAlertThresholdPct && (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      )}
                    {product.margin?.toFixed(1) || "0.0"}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {filteredProducts?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
