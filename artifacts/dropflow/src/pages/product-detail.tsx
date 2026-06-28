import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetProduct,
  useUpdateProduct,
  useDeleteProduct,
  useGenerateProductDescription,
  useListSuppliers,
  getGetProductQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sparkles, Trash2, Save, Package, AlertTriangle, Tag, X, Plus } from "lucide-react";
import { Link } from "wouter";
const API = "/api";

interface ProductTag { id: number; name: string; color: string | null; }

function TagsSection({ productId }: { productId: number }) {
  const { toast } = useToast();
  const [newTag, setNewTag] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: assignedTags = [], refetch: refetchAssigned } = useQuery<ProductTag[]>({
    queryKey: ["product-tags", productId],
    queryFn: () => fetch(`${API}/products/${productId}/tags`).then(r => r.json()),
    enabled: !!productId,
  });
  const { data: allTags = [] } = useQuery<ProductTag[]>({
    queryKey: ["all-product-tags"],
    queryFn: () => fetch(`${API}/product-tags`).then(r => r.json()),
  });

  const assignedIds = new Set(assignedTags.map(t => t.id));
  const available = allTags.filter(t => !assignedIds.has(t.id));

  const addTag = async (tagId: number) => {
    await fetch(`${API}/products/${productId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    refetchAssigned();
  };

  const removeTag = async (tagId: number) => {
    await fetch(`${API}/products/${productId}/tags/${tagId}`, { method: "DELETE" });
    refetchAssigned();
  };

  const createAndAdd = async () => {
    if (!newTag.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`${API}/product-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTag.trim() }),
      });
      const tag = await res.json();
      await addTag(tag.id);
      setNewTag("");
      toast({ title: `Tag "${tag.name}" added` });
    } catch {
      toast({ title: "Failed to add tag", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" />Tags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5 min-h-[28px]">
          {assignedTags.length === 0 && <span className="text-xs text-muted-foreground">No tags yet</span>}
          {assignedTags.map(tag => (
            <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              {tag.name}
              <button onClick={() => removeTag(tag.id)} className="hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        {available.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {available.map(tag => (
              <button key={tag.id} onClick={() => addTag(tag.id)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="w-2.5 h-2.5" />{tag.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-1.5 pt-1 border-t border-border">
          <Input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && createAndAdd()} placeholder="New tag..." className="h-7 text-xs" />
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={createAndAdd} disabled={adding || !newTag.trim()}>Add</Button>
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_OPTIONS = ["hunting", "researching", "listed", "archived"] as const;

function statusColor(s: string) {
  switch (s) {
    case "listed": return "bg-green-500/10 text-green-400 border-green-500/20";
    case "researching": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "hunting": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    default: return "bg-muted text-muted-foreground";
  }
}

export default function ProductDetail() {
  const { id } = useParams();
  const productId = parseInt(id || "0");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useGetProduct(productId, {
    query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId) },
  });
  const { data: suppliers = [] } = useListSuppliers();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const generateDesc = useGenerateProductDescription();

  const [form, setForm] = useState({
    name: "",
    category: "",
    niche: "",
    status: "hunting" as typeof STATUS_OPTIONS[number],
    costPrice: "",
    sellPrice: "",
    description: "",
    sourceUrl: "",
    notes: "",
    supplierId: "",
    stockQuantity: "",
    stockThreshold: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name ?? "",
        category: product.category ?? "",
        niche: product.niche ?? "",
        status: (product.status as typeof STATUS_OPTIONS[number]) ?? "hunting",
        costPrice: product.costPrice != null ? String(product.costPrice) : "",
        sellPrice: product.sellPrice != null ? String(product.sellPrice) : "",
        description: product.description ?? "",
        sourceUrl: product.sourceUrl ?? "",
        notes: product.notes ?? "",
        supplierId: product.supplierId != null ? String(product.supplierId) : "",
        stockQuantity: product.stockQuantity != null ? String(product.stockQuantity) : "",
        stockThreshold: product.stockThreshold != null ? String(product.stockThreshold) : "",
      });
    }
  }, [product]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Product name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await updateProduct.mutateAsync({
        id: productId,
        data: {
          name: form.name.trim(),
          category: form.category || undefined,
          niche: form.niche || undefined,
          status: form.status,
          costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
          sellPrice: form.sellPrice ? parseFloat(form.sellPrice) : undefined,
          description: form.description || undefined,
          sourceUrl: form.sourceUrl || undefined,
          notes: form.notes || undefined,
          supplierId: form.supplierId ? parseInt(form.supplierId) : undefined,
          stockQuantity: form.stockQuantity !== "" ? parseInt(form.stockQuantity) : undefined,
          stockThreshold: form.stockThreshold !== "" ? parseInt(form.stockThreshold) : undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
      toast({ title: "Product saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteProduct.mutateAsync({ id: productId });
      toast({ title: "Product deleted" });
      navigate("/products");
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
      setDeleting(false);
    }
  };

  const handleGenerate = async () => {
    try {
      await generateDesc.mutateAsync({ id: productId });
      queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
      toast({ title: "AI description generated" });
    } catch {
      toast({ title: "Failed to generate description", variant: "destructive" });
    }
  };

  const margin =
    form.costPrice && form.sellPrice && parseFloat(form.sellPrice) > 0
      ? ((parseFloat(form.sellPrice) - parseFloat(form.costPrice)) / parseFloat(form.sellPrice)) * 100
      : null;

  const stockQty = form.stockQuantity !== "" ? parseInt(form.stockQuantity) : null;
  const stockThresh = form.stockThreshold !== "" ? parseInt(form.stockThreshold) : null;
  const isLowStock = stockQty != null && stockThresh != null && stockQty < stockThresh;

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
  if (!product) return <div className="p-6 text-muted-foreground">Product not found.</div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/products">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {product.name}
            </h1>
            <p className="text-xs text-muted-foreground">ID #{product.id} · Added {new Date(product.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="w-4 h-4 mr-1.5" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Low stock warning */}
      {isLowStock && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>Low stock:</strong> {stockQty} unit{stockQty !== 1 ? "s" : ""} remaining — {stockThresh! - stockQty!} below threshold of {stockThresh}.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Product Name</Label>
                <Input value={form.name} onChange={set("name")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input placeholder="e.g. Electronics" value={form.category} onChange={set("category")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Niche</Label>
                  <Input placeholder="e.g. Home office" value={form.niche} onChange={set("niche")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm((f) => ({ ...f, status: s }))}
                      className={`px-3 py-1.5 text-sm rounded-md border font-medium transition-colors capitalize ${
                        form.status === s
                          ? statusColor(s)
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Source URL</Label>
                <Input placeholder="https://..." value={form.sourceUrl} onChange={set("sourceUrl")} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Internal notes..."
                  value={form.notes}
                  onChange={set("notes")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Description</Label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Product description..."
                  value={form.description}
                  onChange={set("description")}
                />
              </div>
              {product.aiDescription && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /> AI Description</Label>
                  <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground leading-relaxed">
                    {product.aiDescription}
                  </div>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generateDesc.isPending}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                {generateDesc.isPending ? "Generating..." : product.aiDescription ? "Regenerate AI Description" : "Generate AI Description"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Cost Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input className="pl-7" type="number" min="0" step="0.01" placeholder="0.00" value={form.costPrice} onChange={set("costPrice")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Sell Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input className="pl-7" type="number" min="0" step="0.01" placeholder="0.00" value={form.sellPrice} onChange={set("sellPrice")} />
                </div>
              </div>
              {margin != null && (
                <div className="flex justify-between items-center pt-1 border-t border-border">
                  <span className="text-xs text-muted-foreground">Margin</span>
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold ${
                      margin >= 40 ? "border-green-500/30 text-green-400 bg-green-500/10"
                      : margin >= 20 ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                      : "border-red-500/30 text-red-400 bg-red-500/10"
                    }`}
                  >
                    {margin.toFixed(1)}%
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Current Stock</Label>
                <Input type="number" min="0" step="1" placeholder="Units on hand" value={form.stockQuantity} onChange={set("stockQuantity")} />
              </div>
              <div className="space-y-1.5">
                <Label>Alert Threshold</Label>
                <Input type="number" min="0" step="1" placeholder="Alert when below..." value={form.stockThreshold} onChange={set("stockThreshold")} />
                <p className="text-xs text-muted-foreground">An alert will appear on the dashboard when stock falls below this number.</p>
              </div>
              {isLowStock && (
                <div className="flex items-center gap-2 text-orange-400 text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Low stock — {stockThresh! - stockQty!} unit{stockThresh! - stockQty! !== 1 ? "s" : ""} below threshold
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Supplier</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.supplierId}
                onChange={set("supplierId")}
              >
                <option value="">No supplier assigned</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </CardContent>
          </Card>

          <TagsSection productId={productId} />
        </div>
      </div>
    </div>
  );
}
