import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Zap, TrendingUp, Target, Clock, Flame, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useListProducts } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ScoreResult = {
  name: string;
  viralityScore: number;
  platformScores: { tiktok: number; facebook: number; instagram: number; google: number };
  saturation: string;
  trendMomentum: string;
  impulseScore: number;
  estimatedCpm: string;
  launchWindow: string;
  hookAngles: string[];
  margin: number | null;
  verdict: string;
  category: string;
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold w-7 text-right">{score}</span>
    </div>
  );
}

function ViralityRing({ score }: { score: number }) {
  const color = score >= 80 ? "#34d399" : score >= 65 ? "#6366f1" : score >= 50 ? "#f59e0b" : "#f87171";
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#27272a" strokeWidth="8" />
        <circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="text-center">
        <div className="text-2xl font-bold" style={{ color }}>{score}</div>
        <div className="text-[10px] text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

const SATURATION_COLOR: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  medium: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "very-high": "bg-red-500/15 text-red-400 border-red-500/20",
};
const MOMENTUM_COLOR: Record<string, string> = {
  rising: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  stable: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  peaking: "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

export default function ProductScorerPage() {
  const [name, setName] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const { data: products = [] } = useListProducts();

  const { mutate: score, isPending } = useMutation({
    mutationFn: async (productName: string) => {
      const r = await fetch(`${BASE}/api/products/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: productName }),
      });
      return r.json() as Promise<ScoreResult>;
    },
    onSuccess: (data) => setResult(data),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) score(name.trim());
  };

  const PLATFORM_COLORS: Record<string, string> = {
    tiktok: "bg-pink-400",
    facebook: "bg-blue-500",
    instagram: "bg-purple-400",
    google: "bg-emerald-400",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Flame className="w-6 h-6 text-orange-400" />
          Virality Scorer
        </h1>
        <p className="text-muted-foreground text-sm mt-1">AI-powered analysis — score any product's viral potential before you invest</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              placeholder="Enter a product name (e.g. Posture Corrector, LED Cat Collar, Portable Blender…)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Analyzing…" : "Score It"}
            </Button>
          </form>

          {products.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">Or score an existing product:</p>
              <div className="flex flex-wrap gap-1.5">
                {products.slice(0, 8).map((p) => (
                  <button key={p.id}
                    onClick={() => { setName(p.name); score(p.name); }}
                    className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isPending && (
        <Card>
          <CardContent className="p-8 flex items-center justify-center gap-3 text-muted-foreground">
            <Zap className="w-4 h-4 animate-pulse text-primary" />
            <span className="text-sm">Scoring virality across platforms…</span>
          </CardContent>
        </Card>
      )}

      {result && !isPending && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-1">
            <CardContent className="p-5 flex flex-col items-center gap-4">
              <p className="text-sm font-semibold text-center">{result.name}</p>
              <ViralityRing score={result.viralityScore} />
              <Badge variant="outline" className="text-sm font-semibold">{result.verdict}</Badge>

              <div className="w-full space-y-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Platform Scores</p>
                {(["tiktok", "facebook", "instagram", "google"] as const).map((p) => (
                  <div key={p}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs capitalize text-muted-foreground">{p === "google" ? "Google" : p === "tiktok" ? "TikTok" : p.charAt(0).toUpperCase() + p.slice(1)}</span>
                    </div>
                    <ScoreBar score={result.platformScores[p]} color={PLATFORM_COLORS[p]} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Market Saturation</p>
                  <Badge variant="outline" className={SATURATION_COLOR[result.saturation] ?? ""}>
                    {result.saturation.replace("-", " ")}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Trend Momentum</p>
                  <Badge variant="outline" className={MOMENTUM_COLOR[result.trendMomentum] ?? ""}>
                    {result.trendMomentum}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Impulse-Buy Score</p>
                  <p className="text-xl font-bold text-primary">{result.impulseScore}<span className="text-sm text-muted-foreground">/100</span></p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Est. CPM</p>
                  <p className="text-xl font-bold">{result.estimatedCpm}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Launch Window
                </p>
                <p className="text-sm font-semibold">{result.launchWindow}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Target className="w-3 h-3" /> Recommended Hook Angles
                </p>
                <div className="space-y-2">
                  {result.hookAngles.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {result.margin !== null && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Profit Margin</p>
                  <p className={`text-xl font-bold ${result.margin >= 40 ? "text-emerald-400" : result.margin >= 25 ? "text-yellow-400" : "text-red-400"}`}>
                    {result.margin}%
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {!result && !isPending && (
        <div className="text-center py-16 text-muted-foreground">
          <Flame className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Enter a product name above to get its virality score</p>
          <p className="text-xs mt-1 opacity-60">Scored across TikTok, Facebook, Instagram & Google</p>
        </div>
      )}
    </div>
  );
}
