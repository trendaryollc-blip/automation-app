import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Link2,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  CheckCheck,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plug,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Connection = {
  id: number;
  storeName: string;
  storeUrl: string | null;
  platform: string;
  apiKey: string;
  status: string;
  notes: string | null;
  totalOrdersSynced: number;
  totalProductsSynced: number;
  lastSyncedAt: string | null;
  createdAt: string;
  config: Record<string, unknown> | null;
};
type SyncLog = {
  id: number;
  event: string;
  status: string;
  payload: string | null;
  error: string | null;
  createdAt: string;
};

const PLATFORMS = [
  "custom",
  "wordpress",
  "woocommerce",
  "webflow",
  "framer",
  "squarespace",
  "wix",
  "cjdropshipping",
  "zendrop",
  "other",
];

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  disabled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const LOG_STATUS_ICON: Record<string, any> = {
  success: CheckCircle2,
  error: XCircle,
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      className="text-muted-foreground hover:text-primary transition-colors ml-1"
    >
      {copied ? (
        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

const EMPTY_FORM = {
  storeName: "",
  storeUrl: "",
  platform: "custom",
  notes: "",
  config: {} as Record<string, unknown>,
};

export default function StoreConnectionsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showKey, setShowKey] = useState<Record<number, boolean>>({});

  const { data: connections = [], isLoading } = useQuery<Connection[]>({
    queryKey: ["store-connections"],
    queryFn: () => fetch(`${BASE}/api/store-connections`).then((r) => r.json()),
  });

  const { data: logs = [] } = useQuery<SyncLog[]>({
    queryKey: ["store-connection-logs", expanded],
    queryFn: () =>
      expanded
        ? fetch(`${BASE}/api/store-connections/${expanded}/logs`).then((r) =>
            r.json(),
          )
        : Promise.resolve([]),
    enabled: !!expanded,
  });

  const create = useMutation({
    mutationFn: (body: object) =>
      fetch(`${BASE}/api/store-connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["store-connections"] });
      setShowNew(false);
      setForm(EMPTY_FORM);
      setExpanded(data.id);
      setShowKey({ [data.id]: true });
      toast({
        title: "Store connected!",
        description: "Your API key is ready — copy it below.",
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      fetch(`${BASE}/api/store-connections/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-connections"] });
      toast({ title: "Connection removed" });
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(`${BASE}/api/store-connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store-connections"] }),
  });

  const regenKey = useMutation({
    mutationFn: (id: number) =>
      fetch(`${BASE}/api/store-connections/${id}/regenerate-key`, {
        method: "POST",
      }).then((r) => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["store-connections"] });
      setShowKey((prev) => ({ ...prev, [data.id]: true }));
      toast({
        title: "API key regenerated",
        description: "Update your store with the new key.",
      });
    },
  });

  const testConnection = useMutation({
    mutationFn: (id: number) =>
      fetch(`${BASE}/api/store-connections/${id}/test`, {
        method: "POST",
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.ok) {
        toast({ title: "Connection successful", description: data.message });
      } else {
        toast({
          title: "Connection failed",
          description: data.error,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Test failed",
        description: "Could not reach the server.",
        variant: "destructive",
      });
    },
  });

  const webhookUrl = `${window.location.origin}${BASE}/api/webhooks/store`;

  const maskedKey = (key: string) =>
    key.slice(0, 6) + "•".repeat(key.length - 10) + key.slice(-4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plug className="w-6 h-6 text-primary" /> Store Connections
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Connect any custom store — Trendaryo, WordPress, or any site you
            built — via webhook
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Connect Store
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="space-y-2 flex-1">
              <p className="text-sm font-semibold">
                How to connect Trendaryo (or any custom store)
              </p>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>
                  Click{" "}
                  <strong className="text-foreground">Connect Store</strong>{" "}
                  below, enter your store name, and save — you'll get an API
                  key.
                </li>
                <li>
                  In your store's checkout/order-complete code, send a{" "}
                  <code className="bg-muted px-1 rounded">POST</code> request to
                  the Webhook URL below.
                </li>
                <li>
                  Include the header{" "}
                  <code className="bg-muted px-1 rounded">
                    X-DropFlow-Key: YOUR_API_KEY
                  </code>{" "}
                  for authentication.
                </li>
                <li>
                  Every order instantly appears in DropFlow's Orders page with a
                  tag from your store.
                </li>
              </ol>
              <div className="mt-3 flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Webhook URL:
                </span>
                <code className="text-xs font-mono text-primary flex-1 truncate">
                  {webhookUrl}
                </code>
                <CopyButton text={webhookUrl} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showNew && (
        <Card className="border-primary/40">
          <CardContent className="p-5">
            <p className="text-sm font-semibold mb-4">Connect a New Store</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Store name (e.g. Trendaryo)"
                value={form.storeName}
                onChange={(e) =>
                  setForm({ ...form, storeName: e.target.value })
                }
              />
              <Input
                placeholder="Store URL (e.g. https://trendaryo.com)"
                value={form.storeUrl}
                onChange={(e) => setForm({ ...form, storeUrl: e.target.value })}
              />
              <select
                className="bg-muted border border-border rounded-md px-3 py-2 text-sm"
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {(form.platform === "cjdropshipping" ||
              form.platform === "zendrop") && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input
                  placeholder={
                    form.platform === "cjdropshipping"
                      ? "CJ API Key"
                      : "Zendrop API Key"
                  }
                  value={(form.config?.apiKey as string) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      config: { ...form.config, apiKey: e.target.value },
                    })
                  }
                />
                {form.platform === "cjdropshipping" && (
                  <Input
                    placeholder="CJ API Secret"
                    value={(form.config?.apiSecret as string) || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        config: { ...form.config, apiSecret: e.target.value },
                      })
                    }
                  />
                )}
                <Input
                  placeholder="Base URL (optional)"
                  value={(form.config?.baseUrl as string) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      config: { ...form.config, baseUrl: e.target.value },
                    })
                  }
                  className="col-span-2"
                />
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => {
                  if (!form.storeName.trim()) {
                    toast({
                      title: "Store name required",
                      description: "Please enter a name for your store.",
                      variant: "destructive",
                    });
                    return;
                  }
                  create.mutate(form);
                }}
                disabled={create.isPending}
              >
                {create.isPending ? "Connecting…" : "Connect & Generate Key"}
              </Button>
              <Button variant="outline" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="h-14 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : connections.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Plug className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No stores connected yet</p>
          <p className="text-xs mt-1 opacity-60">
            Click "Connect Store" to link Trendaryo or any custom website
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((conn) => {
            const isOpen = expanded === conn.id;
            const keyVisible = showKey[conn.id];
            return (
              <Card key={conn.id}>
                <CardContent className="p-0">
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : conn.id)}
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {conn.storeName}
                        </span>
                        <Badge
                          variant="outline"
                          className={STATUS_COLOR[conn.status] ?? ""}
                        >
                          {conn.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {conn.platform}
                        </Badge>
                        {conn.storeUrl && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {conn.storeUrl}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{conn.totalOrdersSynced} orders synced</span>
                        {conn.lastSyncedAt && (
                          <span>
                            Last sync:{" "}
                            {new Date(conn.lastSyncedAt).toLocaleString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          toggle.mutate({
                            id: conn.id,
                            status:
                              conn.status === "active" ? "disabled" : "active",
                          })
                        }
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${conn.status === "active" ? "border-orange-500/30 text-orange-400 hover:bg-orange-500/10" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"}`}
                      >
                        {conn.status === "active" ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => remove.mutate(conn.id)}
                        className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border px-5 pb-5 pt-4 space-y-5">
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Your API Key
                        </p>
                        <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                          <code className="text-xs font-mono flex-1 truncate text-primary">
                            {keyVisible ? conn.apiKey : maskedKey(conn.apiKey)}
                          </code>
                          <button
                            onClick={() =>
                              setShowKey((prev) => ({
                                ...prev,
                                [conn.id]: !keyVisible,
                              }))
                            }
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            {keyVisible ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {keyVisible && <CopyButton text={conn.apiKey} />}
                          <button
                            onClick={() => regenKey.mutate(conn.id)}
                            className="text-muted-foreground hover:text-orange-400 transition-colors ml-1"
                            title="Regenerate key"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {(conn.platform === "cjdropshipping" ||
                        conn.platform === "zendrop") && (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {conn.platform === "cjdropshipping"
                              ? "CJ Dropshipping"
                              : "Zendrop"}{" "}
                            Connection
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testConnection.mutate(conn.id)}
                            disabled={testConnection.isPending}
                            className="gap-1.5"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${testConnection.isPending ? "animate-spin" : ""}`}
                            />
                            {testConnection.isPending
                              ? "Testing…"
                              : "Test Connection"}
                          </Button>
                        </div>
                      )}

                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Integration Code
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Add this to your store's order-complete handler
                          (JavaScript/Node.js example):
                        </p>
                        <pre className="bg-zinc-900 border border-border rounded-lg p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">{`// In your Trendaryo checkout/order handler:
await fetch("${webhookUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-DropFlow-Key": "${keyVisible ? conn.apiKey : "YOUR_API_KEY"}"
  },
  body: JSON.stringify({
    event: "order.created",
    order: {
      orderNumber: order.id,        // your order ID
      customerName: customer.name,
      customerEmail: customer.email,
      productName: item.name,
      quantity: item.qty,
      sellPrice: item.price,        // what customer paid
      costPrice: item.costPrice,    // your supplier cost
      status: "pending",
      shippingAddress: customer.address
    }
  })
});`}</pre>
                        <div className="flex items-center gap-2">
                          <CopyButton
                            text={`await fetch("${webhookUrl}", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "X-DropFlow-Key": "${conn.apiKey}"\n  },\n  body: JSON.stringify({\n    event: "order.created",\n    order: {\n      orderNumber: order.id,\n      customerName: customer.name,\n      customerEmail: customer.email,\n      productName: item.name,\n      quantity: item.qty,\n      sellPrice: item.price,\n      costPrice: item.costPrice,\n      status: "pending",\n      shippingAddress: customer.address\n    }\n  })\n});`}
                          />
                          <span className="text-xs text-muted-foreground">
                            Copy full snippet
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Sync Log (last 50 events)
                        </p>
                        {logs.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No events yet — send your first order from Trendaryo
                            to see it here.
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {logs.map((log) => {
                              const Icon =
                                LOG_STATUS_ICON[log.status] ?? AlertCircle;
                              return (
                                <div
                                  key={log.id}
                                  className="flex items-start gap-2 text-xs"
                                >
                                  <Icon
                                    className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${log.status === "success" ? "text-emerald-400" : "text-red-400"}`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium">
                                      {log.event}
                                    </span>
                                    {log.error && (
                                      <span className="text-red-400 ml-2">
                                        {log.error}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-muted-foreground shrink-0">
                                    {new Date(log.createdAt).toLocaleTimeString(
                                      "en-US",
                                      { hour: "2-digit", minute: "2-digit" },
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
