import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, Truck, ShoppingCart, FlaskConical, SearchCheck, Calculator, Eye, FileBarChart, ShoppingBag, Bell, Settings, Upload, BarChart2, Users, Zap, Tag, RotateCcw, Wallet, Flame, Rocket, Megaphone, Plug, Brain, ListChecks } from "lucide-react";
import { useGetStockAlerts, useListPriceWatches } from "@workspace/api-client-react";
import { loadSettings } from "@/pages/settings";

function useTotalAlerts() {
  const settings = loadSettings();
  const { data: stockAlerts = [] } = useGetStockAlerts();
  const { data: watches = [] } = useListPriceWatches();
  const priceAlerts = watches.filter((w) => {
    if (w.myPrice == null || w.latestPrice == null) return false;
    const diffPct = Math.abs((w.myPrice - w.latestPrice) / w.latestPrice) * 100;
    return diffPct >= settings.priceAlertThresholdPct;
  });
  return (settings.lowStockAlertsEnabled ? stockAlerts.length : 0) + priceAlerts.length;
}

const NAV_GROUPS = [
  {
    label: "Store",
    links: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/products", label: "Products", icon: Package },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/orders", label: "Orders", icon: ShoppingCart },
      { href: "/returns", label: "Returns", icon: RotateCcw },
    ],
  },
  {
    label: "Sourcing",
    links: [
      { href: "/suppliers", label: "Suppliers", icon: Truck },
      { href: "/suppliers/find", label: "Supplier Finder", icon: SearchCheck },
      { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingBag },
      { href: "/research", label: "Research", icon: FlaskConical },
    ],
  },
  {
    label: "Finance",
    links: [
      { href: "/analytics", label: "Analytics", icon: BarChart2 },
      { href: "/pl-report", label: "P&L Report", icon: FileBarChart },
      { href: "/cash-flow", label: "Cash Flow", icon: Wallet },
      { href: "/ad-spend", label: "Ad Spend & ROAS", icon: Megaphone },
      { href: "/promotions", label: "Promotions", icon: Tag },
      { href: "/margin-calculator", label: "Margin Calc", icon: Calculator },
    ],
  },
  {
    label: "Intelligence",
    links: [
      { href: "/product-scorer", label: "Virality Scorer", icon: Flame },
      { href: "/velocity", label: "Sales Velocity", icon: Zap },
      { href: "/price-watch", label: "Price Watch", icon: Eye },
      { href: "/reorder", label: "Reorder", icon: ShoppingBag },
    ],
  },
  {
    label: "Launch",
    links: [
      { href: "/launches", label: "Launch Planner", icon: Rocket },
    ],
  },
  {
    label: "Integrations",
    links: [
      { href: "/fulfillment", label: "Fulfillment Queue", icon: ListChecks },
      { href: "/store-connections", label: "Store Connections", icon: Plug },
      { href: "/ai-settings", label: "AI Settings", icon: Brain },
    ],
  },
  {
    label: "Tools",
    links: [
      { href: "/import", label: "CSV Import", icon: Upload },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const totalAlerts = useTotalAlerts();

  return (
    <div className="flex min-h-screen w-full">
      <div className="w-56 border-r border-border bg-card flex flex-col">
        <div className="p-4 pb-3">
          <h1 className="text-lg font-bold tracking-tight text-primary">DropFlow</h1>
        </div>
        <nav className="flex-1 px-3 space-y-4 overflow-y-auto pb-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1">{group.label}</p>
              <div className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="px-3 pb-4 border-t border-border pt-3 space-y-0.5">
          <Link href="/notifications" className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${location === "/notifications" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
            <div className="relative">
              <Bell className="w-3.5 h-3.5" />
              {totalAlerts > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {totalAlerts > 9 ? "9+" : totalAlerts}
                </span>
              )}
            </div>
            Notifications
            {totalAlerts > 0 && (
              <span className="ml-auto text-xs bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-1.5 py-0.5 font-semibold">
                {totalAlerts}
              </span>
            )}
          </Link>
          <Link href="/settings" className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${location === "/settings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
            <Settings className="w-3.5 h-3.5" />
            Settings
          </Link>
        </div>
      </div>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
