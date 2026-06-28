import { useState, useRef, useCallback } from "react";
import { Upload, FileText, Download, CheckCircle2, XCircle, AlertTriangle, RotateCcw, Package, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type ImportType = "products" | "orders" | "shopify";

interface ParsedRow {
  index: number;
  data: Record<string, string>;
  errors: string[];
}

interface ImportResult {
  imported: number;
  errors: { row: number; error: string }[];
}

const PRODUCTS_COLUMNS = ["name", "category", "niche", "status", "costPrice", "sellPrice", "stockQuantity", "stockThreshold", "description", "sourceUrl", "notes"];
const ORDERS_COLUMNS = ["orderNumber", "productName", "customerName", "customerEmail", "quantity", "status", "costPrice", "sellPrice", "supplierName", "trackingNumber"];
const SHOPIFY_COLUMNS = ["Name", "Email", "Financial Status", "Paid at", "Fulfillment Status", "Lineitem name", "Lineitem quantity", "Lineitem price"];

const SAMPLE_SHOPIFY = [
  "Name,Email,Financial Status,Paid at,Fulfillment Status,Lineitem name,Lineitem quantity,Lineitem price",
  "#1001,alice@example.com,paid,2024-01-15,fulfilled,Wireless Earbuds Pro,1,49.99",
  "#1002,bob@example.com,paid,2024-01-16,unfulfilled,Smart Watch Fitness Tracker,2,89.99",
].join("\n");

function mapShopifyRow(row: Record<string, string>): Record<string, string> {
  return {
    orderNumber: row["Name"] || "",
    customerEmail: row["Email"] || "",
    customerName: row["Email"]?.split("@")[0] || "Customer",
    productName: row["Lineitem name"] || "",
    quantity: row["Lineitem quantity"] || "1",
    sellPrice: row["Lineitem price"] || "",
    status: row["Fulfillment Status"] === "fulfilled" ? "delivered" : row["Fulfillment Status"] === "partial" ? "shipped" : "pending",
  };
}

function validateShopifyRow(row: Record<string, string>, index: number): ParsedRow {
  const errors: string[] = [];
  if (!row["Lineitem name"]?.trim()) errors.push("Lineitem name is required");
  if (!row["Name"]?.trim()) errors.push("Order Name is required");
  return { index, data: mapShopifyRow(row), errors };
}

const PRODUCT_STATUSES = ["hunting", "researching", "listed", "archived"];
const ORDER_STATUSES = ["pending", "placed", "shipped", "delivered", "cancelled"];

const SAMPLE_PRODUCTS = [
  "name,category,niche,status,costPrice,sellPrice,stockQuantity,stockThreshold,description",
  "Blue Light Glasses,Accessories,WFH / desk setup,hunting,6.50,24.99,50,10,Anti-fatigue blue light blocking glasses",
  "Bamboo Toothbrush Set,Health & Wellness,Eco products,listed,2.20,9.99,200,30,Pack of 4 biodegradable bamboo toothbrushes",
  "Silicone Kitchen Set,Kitchen,Eco home,researching,11.00,38.99,,,Non-stick silicone cooking utensils",
].join("\n");

const SAMPLE_ORDERS = [
  "orderNumber,productName,customerName,customerEmail,quantity,status,costPrice,sellPrice,supplierName",
  "DF-2001,Blue Light Glasses,Alice Johnson,alice@example.com,2,delivered,6.50,24.99,AliSource Global",
  "DF-2002,Bamboo Toothbrush Set,Bob Smith,bob@example.com,1,shipped,2.20,9.99,Sunrise Wholesale",
  "DF-2003,Silicone Kitchen Set,Chloe Dubois,chloe@example.com,3,pending,11.00,38.99,",
].join("\n");

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
  return { headers, rows };
}

function validateProductRow(row: Record<string, string>, index: number): ParsedRow {
  const errors: string[] = [];
  if (!row.name?.trim()) errors.push("name is required");
  if (row.costPrice && isNaN(Number(row.costPrice))) errors.push("costPrice must be a number");
  if (row.sellPrice && isNaN(Number(row.sellPrice))) errors.push("sellPrice must be a number");
  if (row.stockQuantity && isNaN(Number(row.stockQuantity))) errors.push("stockQuantity must be a number");
  if (row.status && !PRODUCT_STATUSES.includes(row.status)) errors.push(`status must be one of: ${PRODUCT_STATUSES.join(", ")}`);
  return { index, data: row, errors };
}

function validateOrderRow(row: Record<string, string>, index: number): ParsedRow {
  const errors: string[] = [];
  if (!row.productName?.trim()) errors.push("productName is required");
  if (row.costPrice && isNaN(Number(row.costPrice))) errors.push("costPrice must be a number");
  if (row.sellPrice && isNaN(Number(row.sellPrice))) errors.push("sellPrice must be a number");
  if (row.quantity && isNaN(Number(row.quantity))) errors.push("quantity must be a number");
  if (row.status && !ORDER_STATUSES.includes(row.status)) errors.push(`status must be one of: ${ORDER_STATUSES.join(", ")}`);
  return { index, data: row, errors };
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export default function ImportPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<ImportType>("products");
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParsed(null);
    setHeaders([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleTab = (t: ImportType) => {
    setTab(t);
    reset();
  };

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a .csv file", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows } = parseCsv(text);
      setHeaders(h);
      const validate = tab === "products" ? validateProductRow : tab === "shopify" ? validateShopifyRow : validateOrderRow;
      setParsed(rows.map((r, i) => validate(r, i)));
    };
    reader.readAsText(file);
  }, [tab, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const validRows = parsed?.filter((r) => r.errors.length === 0) ?? [];
  const invalidRows = parsed?.filter((r) => r.errors.length > 0) ?? [];

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const endpoint = tab === "products" ? `${BASE}/api/products/import` : `${BASE}/api/orders/import`; // shopify also imports as orders
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows.map((r) => r.data) }),
      });
      const data: ImportResult = await resp.json();
      setResult(data);
      if (data.imported > 0) {
        toast({ title: `Imported ${data.imported} ${tab} successfully` });
      }
      if (data.errors.length > 0) {
        toast({ title: `${data.errors.length} rows failed`, variant: "destructive" });
      }
    } catch {
      toast({ title: "Import failed", description: "Could not reach the server", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const previewRows = parsed?.slice(0, 8) ?? [];
  const hasMore = (parsed?.length ?? 0) > 8;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Upload className="w-6 h-6 text-primary" />
          CSV Import
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bulk-upload products or orders from a CSV spreadsheet.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => handleTab("products")} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ${tab === "products" ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>
          <Package className="w-4 h-4" />Products
        </button>
        <button onClick={() => handleTab("orders")} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ${tab === "orders" ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>
          <ShoppingCart className="w-4 h-4" />Orders
        </button>
        <button onClick={() => handleTab("shopify")} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ${tab === "shopify" ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>
          <Upload className="w-4 h-4" />Shopify / WooCommerce
        </button>
      </div>

      {/* Template Download */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            CSV Format
          </CardTitle>
          <CardDescription className="text-xs">
            {tab === "products"
              ? `Required: name. Optional: ${PRODUCTS_COLUMNS.slice(1).join(", ")}`
              : tab === "shopify"
              ? `Shopify / WooCommerce export format. Required columns: ${SHOPIFY_COLUMNS.slice(0, 3).join(", ")}…`
              : `Required: productName. Optional: ${ORDERS_COLUMNS.slice(1).join(", ")}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2 mb-3">
            {(tab === "products" ? PRODUCTS_COLUMNS : tab === "shopify" ? SHOPIFY_COLUMNS : ORDERS_COLUMNS).map((col) => (
              <code key={col} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{col}</code>
            ))}
          </div>
          {tab === "shopify" && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3 text-xs text-blue-300 mb-3">
              <p className="font-medium mb-1">Shopify / WooCommerce export instructions:</p>
              <p>In Shopify: <strong>Orders → Export → All orders → CSV</strong>. In WooCommerce: <strong>WooCommerce → Orders → Export</strong>. Upload the file as-is — columns are auto-mapped to DropFlow orders.</p>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCsv(
              tab === "products" ? SAMPLE_PRODUCTS : tab === "shopify" ? SAMPLE_SHOPIFY : SAMPLE_ORDERS,
              `dropflow-${tab}-template.csv`
            )}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download sample CSV
          </Button>
        </CardContent>
      </Card>

      {/* Drop Zone */}
      {!parsed && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-16 cursor-pointer transition-colors
            ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/30"}`}
        >
          <Upload className={`w-8 h-8 mb-3 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
          <p className="font-medium text-sm">
            {dragging ? "Drop your CSV here" : "Drag & drop a CSV file, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Only .csv files are supported</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Preview */}
      {parsed && !result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Preview — {fileName}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {parsed.length} rows parsed ·{" "}
                  <span className="text-green-400">{validRows.length} valid</span>
                  {invalidRows.length > 0 && (
                    <> · <span className="text-red-400">{invalidRows.length} with errors</span></>
                  )}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-10">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-8">✓</th>
                    {headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.index} className={`border-t border-border ${row.errors.length > 0 ? "bg-red-500/5" : ""}`}>
                      <td className="px-3 py-2 text-muted-foreground">{row.index + 1}</td>
                      <td className="px-3 py-2">
                        {row.errors.length === 0 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                      </td>
                      {headers.map((h) => (
                        <td key={h} className="px-3 py-2 max-w-[140px] truncate" title={row.data[h]}>
                          {row.data[h] || <span className="text-muted-foreground/40">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {hasMore && (
                    <tr className="border-t border-border">
                      <td colSpan={headers.length + 2} className="px-3 py-2 text-center text-muted-foreground text-xs italic">
                        + {parsed.length - 8} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Inline errors */}
            {invalidRows.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-semibold text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Rows with errors will be skipped during import:
                </p>
                {invalidRows.slice(0, 5).map((r) => (
                  <p key={r.index} className="text-xs text-red-400/80 ml-5">
                    Row {r.index + 1}: {r.errors.join(" · ")}
                  </p>
                ))}
                {invalidRows.length > 5 && (
                  <p className="text-xs text-muted-foreground ml-5">and {invalidRows.length - 5} more…</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {validRows.length} of {parsed.length} rows will be imported.
              </p>
              <Button
                onClick={handleImport}
                disabled={validRows.length === 0 || importing}
                size="sm"
              >
                {importing ? (
                  <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2" />Importing…</>
                ) : (
                  <><Upload className="w-3.5 h-3.5 mr-1.5" />Import {validRows.length} rows</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center py-6">
              {result.imported > 0 ? (
                <CheckCircle2 className="w-10 h-10 text-green-400 mb-3" />
              ) : (
                <XCircle className="w-10 h-10 text-red-400 mb-3" />
              )}
              <p className="font-semibold text-lg">Import complete</p>
              <div className="flex gap-3 mt-3">
                {result.imported > 0 && (
                  <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10">
                    {result.imported} imported
                  </Badge>
                )}
                {result.errors.length > 0 && (
                  <Badge variant="outline" className="text-red-400 border-red-500/30 bg-red-500/10">
                    {result.errors.length} failed
                  </Badge>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="mt-4 text-left w-full max-w-md">
                  <p className="text-xs font-semibold text-red-400 mb-1">Server errors:</p>
                  {result.errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-red-400/80">Row {e.row}: {e.error}</p>
                  ))}
                </div>
              )}
              <Button className="mt-6" onClick={reset}>
                <Upload className="w-4 h-4 mr-1.5" />
                Import another file
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
