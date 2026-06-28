import { useState } from "react";
import { Eye, Plus, Trash2, ExternalLink, TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useListPriceWatches,
  useCreatePriceWatch,
  useDeletePriceWatch,
  useListPriceSnapshots,
  useAddPriceSnapshot,
  type PriceWatch,
} from "@workspace/api-client-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function PriceTrend({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.005) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  if (diff < 0) return <TrendingDown className="w-3.5 h-3.5 text-green-400" />;
  return <TrendingUp className="w-3.5 h-3.5 text-red-400" />;
}

function SnapshotPanel({ watchId, myPrice }: { watchId: number; myPrice: number | null }) {
  const { data: snapshots = [], refetch } = useListPriceSnapshots(watchId);
  const addSnapshot = useAddPriceSnapshot();
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleLog = async () => {
    const val = parseFloat(price);
    if (isNaN(val) || val <= 0) { toast({ title: "Enter a valid price", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      await addSnapshot.mutateAsync({ id: watchId, data: { price: val, note: note || null } });
      setPrice("");
      setNote("");
      refetch();
      toast({ title: "Price logged" });
    } catch {
      toast({ title: "Failed to log price", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const chartData = snapshots.map((s) => ({
    date: shortDate(s.recordedAt),
    price: s.price,
    myPrice,
  }));

  return (
    <div className="mt-4 space-y-4">
      {/* Log price form */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            className="pl-7 w-32"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <Input
          className="flex-1 min-w-40"
          placeholder="Optional note (e.g. 'Flash sale')"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button size="sm" onClick={handleLog} disabled={submitting || !price}>
          Log Price
        </Button>
      </div>

      {snapshots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No snapshots yet. Log the first price above.</p>
      ) : (
        <>
          {/* Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={48} />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: "#9ca3af" }}
                  formatter={(v: number, name: string) => [fmt(v), name === "myPrice" ? "My Price" : "Competitor"]}
                />
                <Line type="monotone" dataKey="price" stroke="#818cf8" strokeWidth={2} dot={{ r: 3, fill: "#818cf8" }} name="price" />
                {myPrice != null && (
                  <Line type="monotone" dataKey="myPrice" stroke="#4ade80" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="myPrice" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Snapshot table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left pb-2 pr-4">Date</th>
                  <th className="text-right pb-2 pr-4">Competitor Price</th>
                  {myPrice != null && <th className="text-right pb-2 pr-4">vs My Price</th>}
                  <th className="text-left pb-2">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...snapshots].reverse().map((s, i) => {
                  const diff = myPrice != null ? myPrice - s.price : null;
                  return (
                    <tr key={s.id}>
                      <td className="py-1.5 pr-4 text-muted-foreground">{shortDate(s.recordedAt)}</td>
                      <td className="py-1.5 pr-4 text-right font-semibold">{fmt(s.price)}</td>
                      {myPrice != null && (
                        <td className={`py-1.5 pr-4 text-right text-xs font-medium ${diff! > 0 ? "text-green-400" : diff! < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                          {diff! > 0 ? `+${fmt(diff!)} advantage` : diff! < 0 ? `${fmt(diff!)} undercut` : "equal"}
                        </td>
                      )}
                      <td className="py-1.5 text-muted-foreground text-xs">{s.note ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function WatchCard({ watch, onDelete }: { watch: PriceWatch; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const deleteWatch = useDeletePriceWatch();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteWatch.mutateAsync({ id: watch.id });
      onDelete();
      toast({ title: "Removed from watch list" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const diff = watch.myPrice != null && watch.latestPrice != null ? watch.myPrice - watch.latestPrice : null;
  const undercut = diff != null && diff > 0;
  const overtaken = diff != null && diff < 0;

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate">{watch.name}</span>
              {(watch.snapshotCount ?? 0) > 0 && (
                <Badge variant="outline" className="text-xs">{watch.snapshotCount ?? 0} snapshot{(watch.snapshotCount ?? 0) !== 1 ? "s" : ""}</Badge>
              )}
              {undercut && <Badge className="text-xs bg-green-500/10 text-green-400 border-green-500/20">You're cheaper</Badge>}
              {overtaken && <Badge className="text-xs bg-red-500/10 text-red-400 border-red-500/20">Undercut</Badge>}
            </div>
            <a
              href={watch.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5 truncate w-fit max-w-xs"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              {watch.url}
            </a>
            {watch.notes && <p className="text-xs text-muted-foreground mt-1">{watch.notes}</p>}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Latest</div>
              <div className="font-bold flex items-center gap-1 justify-end">
                {watch.latestPrice != null ? (
                  <>
                    <PriceTrend current={watch.latestPrice ?? null} previous={watch.myPrice ?? null} />
                    <span>{fmt(watch.latestPrice)}</span>
                  </>
                ) : <span className="text-muted-foreground text-sm">No data</span>}
              </div>
              {watch.latestRecordedAt && (
                <div className="text-xs text-muted-foreground">{shortDate(watch.latestRecordedAt)}</div>
              )}
            </div>

            {watch.myPrice != null && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">My Price</div>
                <div className="font-semibold text-green-400">{fmt(watch.myPrice)}</div>
                {diff != null && (
                  <div className={`text-xs font-medium ${undercut ? "text-green-400" : "text-red-400"}`}>
                    {undercut ? `+${fmt(Math.abs(diff!))}` : `-${fmt(Math.abs(diff!))}`}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded((x) => !x)}>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {expanded && <SnapshotPanel watchId={watch.id} myPrice={watch.myPrice ?? null} />}
      </CardContent>
    </Card>
  );
}

export default function PriceWatchPage() {
  const { data: watches = [], refetch } = useListPriceWatches<PriceWatch[]>();
  const createWatch = useCreatePriceWatch();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [myPrice, setMyPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !url.trim()) { toast({ title: "Name and URL are required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      await createWatch.mutateAsync({
        data: {
          name: name.trim(),
          url: url.trim(),
          myPrice: myPrice ? parseFloat(myPrice) : null,
          notes: notes.trim() || null,
        },
      });
      setName(""); setUrl(""); setMyPrice(""); setNotes("");
      setShowForm(false);
      refetch();
      toast({ title: "Product added to watch list" });
    } catch {
      toast({ title: "Failed to add product", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const cheaper = watches.filter((w) => w.myPrice != null && w.latestPrice != null && w.myPrice < w.latestPrice).length;
  const undercut = watches.filter((w) => w.myPrice != null && w.latestPrice != null && w.myPrice > w.latestPrice).length;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary" />
            Price Watch
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track competitor prices and spot undercutting opportunities.</p>
        </div>
        <Button onClick={() => setShowForm((x) => !x)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Product
        </Button>
      </div>

      {/* Summary bar */}
      {watches.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-0.5">Tracking</div>
              <div className="text-2xl font-bold">{watches.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-0.5">You're cheaper</div>
              <div className="text-2xl font-bold text-green-400">{cheaper}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-0.5">Being undercut</div>
              <div className="text-2xl font-bold text-red-400">{undercut}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add Competitor Product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Product Name</Label>
                <Input placeholder="e.g. Wireless Earbuds Pro" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Competitor URL</Label>
                <Input placeholder="https://amazon.com/..." value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>My Sell Price (optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input className="pl-7" type="number" min="0" step="0.01" placeholder="0.00" value={myPrice} onChange={(e) => setMyPrice(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Input placeholder="e.g. Main competitor on Amazon" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={submitting}>Add to Watch List</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Watch list */}
      {watches.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Eye className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium">No products being tracked</p>
          <p className="text-sm text-muted-foreground mt-1">Add a competitor product to start logging prices and spotting trends.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {watches.map((w) => (
            <WatchCard key={w.id} watch={w} onDelete={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
