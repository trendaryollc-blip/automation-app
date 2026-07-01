import { motion } from "framer-motion";
import {
  Flame,
  TrendingUp,
  Truck,
  BrainCircuit,
  Sparkles,
  Star,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Zap,
  Target,
  DollarSign,
} from "lucide-react";

/* ─── Trending Products Data ─── */
const TRENDING = [
  { name: "Wireless ANC Earbuds", profit: "$37.49", score: 94, emoji: "🎧" },
  { name: "Smart LED Strips", profit: "$26.79", score: 88, emoji: "💡" },
  { name: "Jade Roller Set", profit: "$21.19", score: 82, emoji: "✨" },
  { name: "Portable Blender", profit: "$30.49", score: 79, emoji: "🔌" },
  { name: "Pet Camera", profit: "$57.99", score: 76, emoji: "📷" },
];

/* ─── Supplier Performance Data ─── */
const SUPPLIERS = [
  {
    name: "TechSource CN",
    reliability: 96,
    delivery: "3-5 days",
    status: "excellent",
  },
  {
    name: "BeautyDrop Co",
    reliability: 92,
    delivery: "4-6 days",
    status: "excellent",
  },
  {
    name: "SmartHome Ltd",
    reliability: 88,
    delivery: "5-7 days",
    status: "good",
  },
  {
    name: "GadgetWorld",
    reliability: 78,
    delivery: "6-8 days",
    status: "fair",
  },
];

/* ─── AI Recommendations ─── */
const AI_RECS = [
  {
    title: "Smart Water Bottle with Temp Display",
    reason: "Trending +210% on social media. Low competition in market.",
    confidence: 92,
    estimatedMargin: "68%",
    icon: <Zap className="w-3.5 h-3.5" />,
  },
  {
    title: "Magnetic Wireless Charger Stand",
    reason: "iPhone 17 launch adjacent. High repeat purchase rate.",
    confidence: 87,
    estimatedMargin: "72%",
    icon: <Target className="w-3.5 h-3.5" />,
  },
  {
    title: "UV-C Sanitizer Box Pro",
    reason: "Health & wellness trend. Cross-sell with phone accessories.",
    confidence: 81,
    estimatedMargin: "65%",
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
];

/* ─── Gauge Bar ─── */
function GaugeBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

export default function ProductSidebar() {
  return (
    <div className="space-y-4">
      {/* ─── Trending Products Widget ─── */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="glass rounded-xl p-4 gradient-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-red-500/15">
            <Flame className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Trending Products</h3>
            <p className="text-[10px] text-muted-foreground">
              Top 5 by virality score
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {TRENDING.map((item, idx) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + idx * 0.1, duration: 0.3 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer group"
            >
              <span className="text-base">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                    {item.profit}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    profit
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-0.5">
                  <TrendingUp className="w-2.5 h-2.5 text-red-400" />
                  <span className="text-[10px] font-mono font-bold text-red-400">
                    {item.score}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── Supplier Performance Widget ─── */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="glass rounded-xl p-4 gradient-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-blue-500/15">
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Supplier Performance</h3>
            <p className="text-[10px] text-muted-foreground">
              Reliability & delivery speed
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {SUPPLIERS.map((sup, idx) => (
            <motion.div
              key={sup.name}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 + idx * 0.1, duration: 0.3 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{sup.name}</span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    sup.status === "excellent"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : sup.status === "good"
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {sup.reliability}%
                </span>
              </div>
              <GaugeBar
                value={sup.reliability}
                color={
                  sup.reliability >= 90
                    ? "linear-gradient(90deg, #10B981, #22D3EE)"
                    : sup.reliability >= 80
                      ? "linear-gradient(90deg, #3B82F6, #8B5CF6)"
                      : "linear-gradient(90deg, #F59E0B, #EF4444)"
                }
              />
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />
                {sup.delivery}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── AI Recommendations Widget ─── */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        className="glass rounded-xl p-4 gradient-border neon-glow-purple"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-violet-500/15">
            <BrainCircuit className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI Recommendations</h3>
            <p className="text-[10px] text-muted-foreground">
              Suggested products to research
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {AI_RECS.map((rec, idx) => (
            <motion.div
              key={rec.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + idx * 0.15, duration: 0.4 }}
              className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-violet-500/20 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="p-1 rounded-md bg-violet-500/15 text-violet-400 mt-0.5">
                  {rec.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold leading-tight">
                    {rec.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    {rec.reason}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-violet-400" />
                  <span className="text-[10px] font-mono font-semibold text-violet-400">
                    {rec.confidence}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    confidence
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
                  <span className="text-[10px] font-mono font-semibold text-emerald-400">
                    {rec.estimatedMargin}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    margin
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-3 py-2 rounded-lg text-xs font-semibold
            bg-gradient-to-r from-violet-500/20 to-blue-500/20
            border border-violet-500/20 text-violet-400
            hover:from-violet-500/30 hover:to-blue-500/30 transition-all"
        >
          <Sparkles className="w-3 h-3 inline mr-1.5" />
          Generate More Suggestions
        </motion.button>
      </motion.div>
    </div>
  );
}
