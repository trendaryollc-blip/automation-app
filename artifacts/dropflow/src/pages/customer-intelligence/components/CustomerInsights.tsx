import { motion } from "framer-motion";
import {
  Crown,
  TrendingDown,
  UserPlus,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Heart,
  Mail,
  DollarSign,
  Brain,
  Zap,
  Target,
  Activity,
} from "lucide-react";

/* ─── Top Spenders ─── */
const TOP_SPENDERS = [
  { name: "James Patel", spend: 5640, orders: 22, avatar: "JP", color: "from-yellow-500/30 to-orange-500/30" },
  { name: "Olivia Bennett", spend: 4280, orders: 18, avatar: "OB", color: "from-blue-500/30 to-violet-500/30" },
  { name: "Isabella Garcia", spend: 3850, orders: 15, avatar: "IG", color: "from-pink-500/30 to-rose-500/30" },
  { name: "Yuki Tanaka", spend: 2980, orders: 16, avatar: "YT", color: "from-emerald-500/30 to-cyan-500/30" },
  { name: "Marcus Chen", spend: 2150, orders: 12, avatar: "MC", color: "from-violet-500/30 to-purple-500/30" },
];

/* ─── Churn Risk ─── */
const CHURN_RISK = [
  { name: "Diego Silva", risk: 87, ltv: 1050, reason: "Inactive 60+ days", avatar: "DS" },
  { name: "Lucas Muller", risk: 72, ltv: 1480, reason: "Declining frequency", avatar: "LM" },
  { name: "Ethan Brown", risk: 94, ltv: 320, reason: "Lost — re-engage", avatar: "EB" },
];

/* ─── New Leads ─── */
const NEW_LEADS = [
  { name: "Aisha Khan", joined: "Today", potential: "High", score: 87, avatar: "AK" },
  { name: "Noah Williams", joined: "Yesterday", potential: "Medium", score: 64, avatar: "NW" },
  { name: "Maya Park", joined: "2 days ago", potential: "High", score: 82, avatar: "MP" },
  { name: "Carlos Rivera", joined: "3 days ago", potential: "Medium", score: 58, avatar: "CR" },
];

/* ─── AI Recommendations ─── */
const AI_RECS = [
  {
    title: "Re-engage 'At Risk' with 15% discount",
    reason: "12 customers haven't ordered in 60+ days. Win-back offer projected to recover $4,200 LTV.",
    confidence: 89,
    impact: "+$4.2K",
    icon: <Zap className="w-3.5 h-3.5" />,
  },
  {
    title: "VIP loyalty program",
    reason: "Top 7% of customers drive 41% of revenue. Personalized rewards could lift LTV by 18%.",
    confidence: 94,
    impact: "+18% LTV",
    icon: <Crown className="w-3.5 h-3.5" />,
  },
  {
    title: "Cross-sell to Loyal segment",
    reason: "248 Loyal customers show 76% repurchase intent on beauty & wellness categories.",
    confidence: 81,
    impact: "+$2.8K",
    icon: <Target className="w-3.5 h-3.5" />,
  },
];

/* ─── Risk Bar ─── */
function RiskBar({ value, color }: { value: number; color: string }) {
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

export default function CustomerInsights() {
  return (
    <div className="space-y-4">
      {/* ─── Top Spenders Widget ─── */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="glass rounded-xl p-4 gradient-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-yellow-500/15">
            <Crown className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Top Spenders</h3>
            <p className="text-[10px] text-muted-foreground">Top 5 by total spend</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {TOP_SPENDERS.map((item, idx) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + idx * 0.1, duration: 0.3 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer group"
            >
              <div className="relative">
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-[10px] font-bold text-foreground`}
                >
                  {item.avatar}
                </div>
                {idx === 0 && (
                  <Crown className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 fill-yellow-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                    ${item.spend.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    · {item.orders} orders
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── Churn Risk Widget ─── */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="glass rounded-xl p-4 gradient-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-red-500/15">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Churn Risk</h3>
            <p className="text-[10px] text-muted-foreground">Predicted to drop off</p>
          </div>
        </div>

        <div className="space-y-3">
          {CHURN_RISK.map((item, idx) => {
            const color =
              item.risk >= 80
                ? "linear-gradient(90deg, #EF4444, #DC2626)"
                : item.risk >= 60
                  ? "linear-gradient(90deg, #F59E0B, #EF4444)"
                  : "linear-gradient(90deg, #FBBF24, #F59E0B)";
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 + idx * 0.1, duration: 0.3 }}
                className="space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500/30 to-red-500/30 flex items-center justify-center text-[9px] font-bold shrink-0">
                      {item.avatar}
                    </div>
                    <span className="text-xs font-medium truncate">
                      {item.name}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      item.risk >= 80
                        ? "bg-red-500/15 text-red-400"
                        : item.risk >= 60
                          ? "bg-orange-500/15 text-orange-400"
                          : "bg-yellow-500/15 text-yellow-400"
                    }`}
                  >
                    {item.risk}%
                  </span>
                </div>
                <RiskBar value={item.risk} color={color} />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-2.5 h-2.5" />
                    {item.reason}
                  </span>
                  <span className="font-mono">${item.ltv.toLocaleString()} LTV</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-3 py-1.5 rounded-lg text-[10px] font-semibold
            bg-gradient-to-r from-red-500/15 to-orange-500/15
            border border-red-500/20 text-red-400
            hover:from-red-500/25 hover:to-orange-500/25 transition-all"
        >
          <AlertTriangle className="w-3 h-3 inline mr-1.5" />
          Run Retention Campaign
        </motion.button>
      </motion.div>

      {/* ─── New Leads Widget ─── */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        className="glass rounded-xl p-4 gradient-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-emerald-500/15">
            <UserPlus className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">New Leads</h3>
            <p className="text-[10px] text-muted-foreground">Recently acquired</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {NEW_LEADS.map((lead, idx) => (
            <motion.div
              key={lead.name}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 + idx * 0.1, duration: 0.3 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center text-[10px] font-bold shrink-0">
                {lead.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{lead.name}</p>
                <p className="text-[10px] text-muted-foreground">{lead.joined}</p>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-0.5 ${
                    lead.potential === "High"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-blue-500/15 text-blue-400"
                  }`}
                >
                  {lead.potential}
                </span>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Score {lead.score}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── AI Recommendations Widget ─── */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="glass rounded-xl p-4 gradient-border neon-glow-purple"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-violet-500/15">
            <Brain className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI Recommendations</h3>
            <p className="text-[10px] text-muted-foreground">Retention strategies</p>
          </div>
        </div>

        <div className="space-y-3">
          {AI_RECS.map((rec, idx) => (
            <motion.div
              key={rec.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 + idx * 0.15, duration: 0.4 }}
              className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-violet-500/20 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="p-1 rounded-md bg-violet-500/15 text-violet-400 mt-0.5 shrink-0">
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
                  <span className="text-[10px] text-muted-foreground">conf.</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
                  <span className="text-[10px] font-mono font-semibold text-emerald-400">
                    {rec.impact}
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
          Generate More Strategies
        </motion.button>
      </motion.div>
    </div>
  );
}
