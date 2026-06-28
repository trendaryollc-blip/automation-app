import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Brain,
  Key,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Provider = {
  id: string;
  label: string;
  defaultModel: string | null;
  freeUrl: string;
  task: string;
};
type SavedKey = {
  provider: string;
  model: string | null;
  hasKey: boolean;
  maskedKey: string;
  updatedAt: string;
};

const PROVIDER_ICONS: Record<string, string> = {
  groq: "⚡",
  mistral: "🌊",
  deepseek: "🔭",
  openrouter: "🔀",
  cohere: "🧬",
  serpapi: "🔍",
};

const MODEL_OPTIONS: Record<string, string[]> = {
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
  ],
  mistral: [
    "mistral-small-latest",
    "mistral-medium-latest",
    "open-mistral-7b",
    "open-mixtral-8x7b",
  ],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  openrouter: [
    "mistralai/mistral-7b-instruct:free",
    "google/gemma-3-27b-it:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "qwen/qwen3-8b:free",
  ],
  cohere: ["command-r", "command-r-plus", "command-light"],
  serpapi: [],
};

export default function AISettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [formState, setFormState] = useState<
    Record<string, { key: string; model: string }>
  >({});
  const [testing, setTesting] = useState<string | null>(null);

  const { data: providers = [] } = useQuery<Provider[]>({
    queryKey: ["ai-providers"],
    queryFn: () =>
      fetch(`${BASE}/api/ai-settings/providers`).then((r) => r.json()),
  });

  const { data: savedKeys = [] } = useQuery<SavedKey[]>({
    queryKey: ["ai-settings"],
    queryFn: () => fetch(`${BASE}/api/ai-settings`).then((r) => r.json()),
  });

  const save = useMutation({
    mutationFn: ({
      provider,
      apiKey,
      model,
    }: {
      provider: string;
      apiKey: string;
      model: string;
    }) =>
      fetch(`${BASE}/api/ai-settings/${provider}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, model }),
      }).then((r) => r.json()),
    onSuccess: (data, vars) => {
      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      qc.invalidateQueries({ queryKey: ["ai-settings"] });
      setExpanded(null);
      setFormState((prev) => ({
        ...prev,
        [vars.provider]: { key: "", model: "" },
      }));
      toast({
        title: "Key saved",
        description: `${vars.provider} is now active.`,
      });
    },
  });

  const remove = useMutation({
    mutationFn: (provider: string) =>
      fetch(`${BASE}/api/ai-settings/${provider}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-settings"] });
      toast({ title: "Key removed" });
    },
  });

  async function testKey(provider: string) {
    setTesting(provider);
    try {
      const res = await fetch(`${BASE}/api/ai-settings/test/${provider}`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok: boolean;
        message?: string;
        error?: string;
      };
      if (data.ok) {
        toast({ title: "✅ Key working!", description: data.message });
      } else {
        toast({
          title: "❌ Key failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Test failed",
        description: "Could not reach provider",
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  }

  const savedMap = Object.fromEntries(savedKeys.map((k) => [k.provider, k]));
  const configuredCount = savedKeys.length;

  function getForm(id: string, defaultModel: string | null) {
    return formState[id] ?? { key: "", model: defaultModel ?? "" };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" /> AI Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Add your free API keys — each provider powers specific automation
            tasks
          </p>
        </div>
        <Badge
          variant={configuredCount > 0 ? "default" : "secondary"}
          className="text-sm px-3 py-1"
        >
          {configuredCount} / {providers.length} configured
        </Badge>
      </div>

      {configuredCount === 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex gap-3 items-start">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-500">
                No AI keys configured yet
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add at least one key below. All providers have generous free
                tiers — click the link next to each to get a free key in
                minutes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {providers.map((p) => {
          const saved = savedMap[p.id];
          const isOpen = expanded === p.id;
          const form = getForm(p.id, p.defaultModel);
          const models = MODEL_OPTIONS[p.id] ?? [];

          return (
            <Card key={p.id} className={saved ? "border-primary/30" : ""}>
              <CardContent className="p-0">
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer select-none"
                  onClick={() => setExpanded(isOpen ? null : p.id)}
                >
                  <span className="text-2xl w-8 text-center">
                    {PROVIDER_ICONS[p.id] ?? "🤖"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{p.label}</span>
                      {saved ? (
                        <Badge variant="default" className="text-xs gap-1 py-0">
                          <CheckCircle className="w-3 h-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs py-0">
                          Not set
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.task}
                    </p>
                    {saved && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {saved.maskedKey}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {saved && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            testKey(p.id);
                          }}
                          disabled={testing === p.id}
                        >
                          {testing === p.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          {testing === p.id ? "Testing…" : "Test"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove.mutate(p.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
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
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ExternalLink className="w-3 h-3" />
                      <a
                        href={p.freeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-primary hover:opacity-80"
                      >
                        Get a free {p.label} API key →
                      </a>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          className="pl-8 font-mono text-sm"
                          placeholder={
                            saved
                              ? "Enter new key to replace…"
                              : "Paste your API key…"
                          }
                          value={form.key}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              [p.id]: {
                                ...getForm(p.id, p.defaultModel),
                                key: e.target.value,
                              },
                            }))
                          }
                          type="password"
                        />
                      </div>
                    </div>

                    {models.length > 0 && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">
                          Model (optional — leave default for free tier)
                        </label>
                        <select
                          className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm"
                          value={form.model}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              [p.id]: {
                                ...getForm(p.id, p.defaultModel),
                                model: e.target.value,
                              },
                            }))
                          }
                        >
                          {models.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          save.mutate({
                            provider: p.id,
                            apiKey: form.key,
                            model: form.model,
                          })
                        }
                        disabled={!form.key.trim() || save.isPending}
                      >
                        {save.isPending
                          ? "Saving…"
                          : saved
                            ? "Update Key"
                            : "Save Key"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpanded(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" /> How AI powers your
            DropFlow
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-muted-foreground">
            <div>
              ⚡ <strong className="text-foreground">Groq</strong> — Virality
              Scorer & product descriptions
            </div>
            <div>
              🔭 <strong className="text-foreground">DeepSeek</strong> — Product
              Research & analysis
            </div>
            <div>
              🌊 <strong className="text-foreground">Mistral</strong> — Market
              trend analysis
            </div>
            <div>
              🔍 <strong className="text-foreground">SerpAPI</strong> — Real web
              search for suppliers
            </div>
            <div>
              🔀 <strong className="text-foreground">OpenRouter</strong> — Free
              model fallback
            </div>
            <div>
              🧬 <strong className="text-foreground">Cohere</strong> — Semantic
              product matching
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Keys are stored securely in your database. Add at least one key to
            unlock real AI — it automatically falls back to the next available
            provider.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
