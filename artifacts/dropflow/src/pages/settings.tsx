import { useState, useEffect } from "react";
import {
  Settings,
  Store,
  DollarSign,
  Bell,
  BarChart2,
  Save,
  RotateCcw,
  Mail,
  Globe,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const SETTINGS_KEY = "dropflow:settings";

const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar", symbol: "$" },
  { code: "EUR", label: "EUR — Euro", symbol: "€" },
  { code: "GBP", label: "GBP — British Pound", symbol: "£" },
  { code: "CAD", label: "CAD — Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "AUD — Australian Dollar", symbol: "A$" },
  { code: "CNY", label: "CNY — Chinese Yuan", symbol: "¥" },
  { code: "JPY", label: "JPY — Japanese Yen", symbol: "¥" },
  { code: "INR", label: "INR — Indian Rupee", symbol: "₹" },
  { code: "BRL", label: "BRL — Brazilian Real", symbol: "R$" },
  { code: "MXN", label: "MXN — Mexican Peso", symbol: "$" },
];

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.53,
  CNY: 7.24,
  JPY: 149.5,
  INR: 83.1,
  BRL: 4.97,
  MXN: 17.2,
};

export interface AppSettings {
  storeName: string;
  currency: string;
  defaultMarginTarget: number;
  defaultStockThreshold: number;
  lowStockAlertsEnabled: boolean;
  priceAlertThresholdPct: number;
  marginAlertThresholdPct: number;
  marginAlertsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  notificationEmail: string;
  emailOnLowStock: boolean;
  emailOnNewOrder: boolean;
  emailOnPriceChange: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  storeName: "My DropFlow Store",
  currency: "USD",
  defaultMarginTarget: 40,
  defaultStockThreshold: 10,
  lowStockAlertsEnabled: true,
  priceAlertThresholdPct: 5,
  marginAlertThresholdPct: 20,
  marginAlertsEnabled: true,
  emailNotificationsEnabled: false,
  notificationEmail: "",
  emailOnLowStock: true,
  emailOnNewOrder: false,
  emailOnPriceChange: true,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function convertCurrency(
  amountUSD: number,
  targetCurrency: string,
): number {
  return amountUSD * (EXCHANGE_RATES[targetCurrency] ?? 1);
}

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "$";
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDirty(true);
  }, [settings]);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = () => {
    saveSettings(settings);
    setDirty(false);
    toast({ title: "Settings saved" });
  };
  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    setDirty(false);
    toast({ title: "Settings reset to defaults" });
  };

  const selectedCurrency = CURRENCIES.find((c) => c.code === settings.currency);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure your store preferences and defaults.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1.5" />
            Save
          </Button>
        </div>
      </div>

      {/* Store Identity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Store className="w-4 h-4" />
            Store Identity
          </CardTitle>
          <CardDescription className="text-xs">
            Basic information about your store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="storeName">Store Name</Label>
            <Input
              id="storeName"
              value={settings.storeName}
              onChange={(e) => set("storeName", e.target.value)}
              placeholder="My DropFlow Store"
            />
          </div>
        </CardContent>
      </Card>

      {/* Multi-currency */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Currency
          </CardTitle>
          <CardDescription className="text-xs">
            Set your store currency for profit, cost, and pricing displays.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Display Currency</Label>
            <Select
              value={settings.currency}
              onValueChange={(v) => set("currency", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {settings.currency !== "USD" && (
            <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">
                Exchange Rate (vs USD)
              </p>
              <p>
                1 USD = {EXCHANGE_RATES[settings.currency]?.toFixed(4)}{" "}
                {settings.currency}
              </p>
              <p>
                Example: $100 USD = {selectedCurrency?.symbol}
                {convertCurrency(100, settings.currency).toFixed(2)}{" "}
                {settings.currency}
              </p>
              <p className="text-muted-foreground/70 mt-1">
                Rates are approximate. Update them in the currency table for
                precise conversions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profitability Defaults */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart2 className="w-4 h-4" />
            Profitability Defaults
          </CardTitle>
          <CardDescription className="text-xs">
            Pre-fill the margin calculator and set alert thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Default Margin Target</Label>
              <span className="text-primary font-bold text-lg">
                {settings.defaultMarginTarget}%
              </span>
            </div>
            <Slider
              min={5}
              max={80}
              step={1}
              value={[settings.defaultMarginTarget]}
              onValueChange={([v]) => set("defaultMarginTarget", v)}
            />
            <p className="text-xs text-muted-foreground">
              Used as the starting value in the Margin Calculator.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Inventory */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Inventory
          </CardTitle>
          <CardDescription className="text-xs">
            Default stock management settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="stockThreshold">Default Low Stock Threshold</Label>
            <Input
              id="stockThreshold"
              type="number"
              min={1}
              value={settings.defaultStockThreshold}
              onChange={(e) =>
                set(
                  "defaultStockThreshold",
                  Math.max(1, parseInt(e.target.value) || 1),
                )
              }
              className="w-28"
            />
            <p className="text-xs text-muted-foreground">
              New products use this as the default reorder trigger.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alerts
          </CardTitle>
          <CardDescription className="text-xs">
            Control which alerts appear in the Notifications center.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label>Low Stock Alerts</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Show alerts for products below their threshold.
              </p>
            </div>
            <Switch
              checked={settings.lowStockAlertsEnabled}
              onCheckedChange={(v) => set("lowStockAlertsEnabled", v)}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Price Alert Threshold</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Alert when competitor price differs by this much.
                </p>
              </div>
              <span className="text-primary font-bold">
                {settings.priceAlertThresholdPct}%
              </span>
            </div>
            <Slider
              min={1}
              max={30}
              step={1}
              value={[settings.priceAlertThresholdPct]}
              onValueChange={([v]) => set("priceAlertThresholdPct", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                Margin Alerts
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Alert when product margin drops below the threshold.
              </p>
            </div>
            <Switch
              checked={settings.marginAlertsEnabled}
              onCheckedChange={(v) => set("marginAlertsEnabled", v)}
            />
          </div>
          {settings.marginAlertsEnabled && (
            <div className="space-y-3 pl-4 border-l-2 border-yellow-500/30">
              <div className="flex items-center justify-between">
                <Label>Minimum Margin Threshold</Label>
                <span className="text-yellow-400 font-bold">
                  {settings.marginAlertThresholdPct}%
                </span>
              </div>
              <Slider
                min={5}
                max={60}
                step={1}
                value={[settings.marginAlertThresholdPct]}
                onValueChange={([v]) => set("marginAlertThresholdPct", v)}
              />
              <p className="text-xs text-muted-foreground">
                Products with margin below this show a warning badge.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Notifications
          </CardTitle>
          <CardDescription className="text-xs">
            Configure where email alerts are sent. Connect an SMTP provider to
            activate delivery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Email Alerts</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send email notifications for key events.
              </p>
            </div>
            <Switch
              checked={settings.emailNotificationsEnabled}
              onCheckedChange={(v) => set("emailNotificationsEnabled", v)}
            />
          </div>
          {settings.emailNotificationsEnabled && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/30">
              <div className="space-y-1.5">
                <Label>Notification Email</Label>
                <Input
                  type="email"
                  value={settings.notificationEmail}
                  onChange={(e) => set("notificationEmail", e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Low Stock Alert</Label>
                    <p className="text-xs text-muted-foreground">
                      Email when stock drops below threshold
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailOnLowStock}
                    onCheckedChange={(v) => set("emailOnLowStock", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">New Order</Label>
                    <p className="text-xs text-muted-foreground">
                      Email when a new order is created
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailOnNewOrder}
                    onCheckedChange={(v) => set("emailOnNewOrder", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Price Change Alert</Label>
                    <p className="text-xs text-muted-foreground">
                      Email when a tracked competitor price changes
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailOnPriceChange}
                    onCheckedChange={(v) => set("emailOnPriceChange", v)}
                  />
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3 text-xs text-blue-300">
                <p className="font-medium mb-1">To activate email delivery:</p>
                <p>
                  Add{" "}
                  <code className="bg-blue-500/20 px-1 rounded">SMTP_HOST</code>
                  ,{" "}
                  <code className="bg-blue-500/20 px-1 rounded">SMTP_USER</code>
                  , and{" "}
                  <code className="bg-blue-500/20 px-1 rounded">SMTP_PASS</code>{" "}
                  as environment secrets, then restart the server. Gmail,
                  SendGrid, and Mailgun are all supported.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-1.5" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-1.5" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
