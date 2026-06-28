import { useGetStockAlerts, useListPriceWatches } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Bell, AlertTriangle, TrendingDown, CheckCircle2, Package, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadSettings } from "./settings";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export default function NotificationsPage() {
  const settings = loadSettings();
  const { data: stockAlerts = [], isLoading: stockLoading } = useGetStockAlerts();
  const { data: watches = [], isLoading: priceLoading } = useListPriceWatches();

  const priceAlerts = watches.filter((w) => {
    if (w.myPrice == null || w.latestPrice == null) return false;
    const diffPct = Math.abs((w.myPrice - w.latestPrice) / w.latestPrice) * 100;
    return diffPct >= settings.priceAlertThresholdPct;
  });

  const undercuts = priceAlerts.filter((w) => w.latestPrice! < w.myPrice!);
  const advantages = priceAlerts.filter((w) => w.latestPrice! > w.myPrice!);

  const filteredStock = settings.lowStockAlertsEnabled ? stockAlerts : [];

  const totalAlerts = filteredStock.length + priceAlerts.length;
  const isLoading = stockLoading || priceLoading;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Notifications
            {totalAlerts > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">
                {totalAlerts}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            All active alerts for your store in one place.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : totalAlerts === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-400 mb-3" />
          <p className="font-semibold text-lg">All clear</p>
          <p className="text-sm text-muted-foreground mt-1">
            No active alerts right now.
          </p>
          {!settings.lowStockAlertsEnabled && (
            <p className="text-xs text-muted-foreground mt-3">
              Low stock alerts are disabled.{" "}
              <Link href="/settings">
                <span className="text-primary underline underline-offset-2 cursor-pointer">Enable in Settings</span>
              </Link>
            </p>
          )}
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Low Stock Alerts */}
          {filteredStock.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  Low Stock
                  <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-400 bg-orange-500/10">
                    {filteredStock.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {filteredStock.map((alert) => (
                    <Link key={alert.id} href={`/products/${alert.id}`}>
                      <div className="flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 px-4 py-3 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-orange-400 shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{alert.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{alert.status}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-orange-400">
                            {alert.stockQuantity} / {alert.stockThreshold} units
                          </div>
                          <div className="text-xs text-orange-500/70">
                            {alert.deficit} below threshold
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <Link href="/reorder">
                    <span className="text-xs text-primary underline underline-offset-2 cursor-pointer">
                      View reorder suggestions →
                    </span>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Price Alerts */}
          {priceAlerts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  Price Watch Alerts
                  <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 bg-blue-500/10">
                    {priceAlerts.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {undercuts.map((w) => {
                  const diff = w.myPrice! - w.latestPrice!;
                  const diffPct = (Math.abs(diff) / w.latestPrice!) * 100;
                  return (
                    <Link key={w.id} href="/price-watch">
                      <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-4 py-3 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{w.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{w.url}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs border-red-500/30 text-red-400 bg-red-500/10">
                            Being undercut
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            Competitor: {fmt(w.latestPrice!)} vs yours: {fmt(w.myPrice!)}
                          </div>
                          <div className="text-xs text-red-400">
                            -{diffPct.toFixed(1)}% cheaper
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {advantages.map((w) => {
                  const diff = w.myPrice! - w.latestPrice!;
                  const diffPct = (Math.abs(diff) / w.latestPrice!) * 100;
                  return (
                    <Link key={w.id} href="/price-watch">
                      <div className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 px-4 py-3 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <TrendingDown className="w-4 h-4 text-green-400 shrink-0 rotate-180" />
                          <div>
                            <p className="font-medium text-sm">{w.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{w.url}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs border-green-500/30 text-green-400 bg-green-500/10">
                            Price advantage
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            Competitor: {fmt(w.latestPrice!)} vs yours: {fmt(w.myPrice!)}
                          </div>
                          <div className="text-xs text-green-400">
                            +{diffPct.toFixed(1)}% cheaper than competitor
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                <div className="mt-3 pt-3 border-t border-border">
                  <Link href="/price-watch">
                    <span className="text-xs text-primary underline underline-offset-2 cursor-pointer">
                      Manage price watches →
                    </span>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground text-center pt-2">
        Alert thresholds can be adjusted in{" "}
        <Link href="/settings">
          <span className="text-primary underline underline-offset-2 cursor-pointer">Settings</span>
        </Link>
        .
      </div>
    </div>
  );
}
