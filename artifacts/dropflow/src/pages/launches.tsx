import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Rocket, Plus, CheckCircle2, Circle, ChevronDown, ChevronRight, Trash2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Step = { key: string; title: string; status: "pending" | "done"; notes: string };
type Launch = {
  id: number; productName: string; status: string; notes: string | null;
  targetLaunchDate: string | null; steps: Step[]; createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  scaling: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  paused: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  killed: "bg-red-500/15 text-red-400 border-red-500/20",
};

const STATUSES = ["planning", "active", "scaling", "paused", "killed"];

export default function LaunchesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");

  const { data: launches = [], isLoading } = useQuery<Launch[]>({
    queryKey: ["launches"],
    queryFn: () => fetch(`${BASE}/api/launches`).then((r) => r.json()),
  });

  const create = useMutation({
    mutationFn: (body: object) => fetch(`${BASE}/api/launches`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["launches"] }); setShowNew(false); setNewName(""); setNewDate(""); },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      fetch(`${BASE}/api/launches/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["launches"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/launches/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["launches"] }); toast({ title: "Launch deleted" }); },
  });

  function toggleStep(launch: Launch, stepKey: string) {
    const newSteps = launch.steps.map((s) =>
      s.key === stepKey ? { ...s, status: s.status === "done" ? "pending" : "done" } : s
    );
    const doneCount = newSteps.filter((s) => s.status === "done").length;
    const newStatus = doneCount === newSteps.length ? "scaling" :
      doneCount >= 5 ? "active" :
      doneCount >= 1 ? "active" : "planning";
    update.mutate({ id: launch.id, body: { steps: newSteps, status: newStatus } });
  }

  function changeStatus(launch: Launch, status: string) {
    update.mutate({ id: launch.id, body: { status } });
  }

  const stats = {
    total: launches.length,
    active: launches.filter((l) => l.status === "active" || l.status === "scaling").length,
    planning: launches.filter((l) => l.status === "planning").length,
    killed: launches.filter((l) => l.status === "killed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Rocket className="w-6 h-6 text-primary" /> Launch Planner</h1>
          <p className="text-muted-foreground text-sm mt-1">Step-by-step product launch workflow — source to scale</p>
        </div>
        <Button onClick={() => setShowNew(true)} size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Launch
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Launches", value: stats.total, color: "text-foreground" },
          { label: "Active / Scaling", value: stats.active, color: "text-emerald-400" },
          { label: "Planning", value: stats.planning, color: "text-blue-400" },
          { label: "Killed", value: stats.killed, color: "text-red-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {showNew && (
        <Card className="border-primary/40">
          <CardContent className="p-5">
            <p className="text-sm font-semibold mb-3">New Launch Plan</p>
            <div className="flex gap-3">
              <Input placeholder="Product name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-40" />
              <Button onClick={() => create.mutate({ productName: newName, targetLaunchDate: newDate || null })} disabled={!newName.trim()}>
                Create
              </Button>
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><div className="h-12 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : launches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Rocket className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No launches yet — create your first product launch plan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {launches.map((launch) => {
            const doneSteps = launch.steps.filter((s) => s.status === "done").length;
            const totalSteps = launch.steps.length;
            const pct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
            const isOpen = expanded === launch.id;

            return (
              <Card key={launch.id} className={launch.status === "killed" ? "opacity-60" : ""}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : launch.id)}>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{launch.productName}</span>
                        <Badge variant="outline" className={STATUS_COLORS[launch.status] ?? ""}>{launch.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-40">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{doneSteps}/{totalSteps} steps</span>
                        {launch.targetLaunchDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(launch.targetLaunchDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        className="text-xs bg-muted border border-border rounded px-2 py-1 text-foreground"
                        value={launch.status}
                        onChange={(e) => changeStatus(launch, e.target.value)}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => remove.mutate(launch.id)} className="text-muted-foreground hover:text-red-400 transition-colors p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                      {launch.steps.map((step) => (
                        <div key={step.key}
                          className="flex items-start gap-3 cursor-pointer group"
                          onClick={() => toggleStep(launch, step.key)}
                        >
                          {step.status === "done"
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            : <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                          }
                          <span className={`text-sm ${step.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {step.title}
                          </span>
                        </div>
                      ))}
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
