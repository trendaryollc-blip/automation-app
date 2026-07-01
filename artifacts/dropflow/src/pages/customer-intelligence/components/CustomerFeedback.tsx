import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Heart,
  Smile,
  Frown,
  Meh,
  Star,
  ThumbsUp,
  MessageCircle,
  TrendingUp,
  Sparkles,
} from "lucide-react";

/* ─── Animated Counter Hook ─── */
function useAnimatedNumber(value: number, duration = 1500) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = display;
    const diff = value - start;
    if (Math.abs(diff) < 0.01) {
      setDisplay(value);
      return;
    }
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return display;
}

/* ─── Circular Gauge ─── */
function CircularGauge({
  value,
  label,
  color,
  size = 130,
}: {
  value: number;
  label: string;
  color: string;
  size?: number;
}) {
  const animatedValue = useAnimatedNumber(value);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient
            id={`gaugeGrad-${label}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
            <stop offset="100%" stopColor={color} stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="6"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#gaugeGrad-${label})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 6px ${color}80)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold gradient-text">
          {Math.round(animatedValue)}
        </span>
        <span className="text-[10px] text-muted-foreground font-medium">
          {label}
        </span>
      </div>
    </div>
  );
}

/* ─── Feedback Distribution ─── */
const FEEDBACK = [
  { emoji: "😍", label: "Delighted", count: 524, pct: 41, color: "#10B981" },
  { emoji: "😊", label: "Satisfied", count: 384, pct: 30, color: "#3B82F6" },
  { emoji: "😐", label: "Neutral", count: 198, pct: 15, color: "#F59E0B" },
  { emoji: "😕", label: "Disappointed", count: 115, pct: 9, color: "#F97316" },
  { emoji: "😠", label: "Frustrated", count: 64, pct: 5, color: "#EF4444" },
];

/* ─── NPS Score ─── */
const NPS_HISTORY = [
  { month: "Jul", score: 42 },
  { month: "Aug", score: 48 },
  { month: "Sep", score: 51 },
  { month: "Oct", score: 58 },
  { month: "Nov", score: 62 },
  { month: "Dec", score: 67 },
];

/* ─── Recent Reviews ─── */
const REVIEWS = [
  {
    name: "Olivia Bennett",
    avatar: "OB",
    rating: 5,
    text: "Fast shipping, great quality products. Will buy again!",
    date: "1 day ago",
    sentiment: "positive",
  },
  {
    name: "Marcus Chen",
    avatar: "MC",
    rating: 4,
    text: "Good experience overall, customer service was helpful.",
    date: "3 days ago",
    sentiment: "positive",
  },
  {
    name: "Lucas Muller",
    avatar: "LM",
    rating: 2,
    text: "Shipping took longer than expected. Product was fine though.",
    date: "1 week ago",
    sentiment: "neutral",
  },
];

export default function CustomerFeedback() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ─── Overall Satisfaction Gauge ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="glass rounded-xl p-5 gradient-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-pink-500/15">
            <Heart className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Overall Satisfaction</h3>
            <p className="text-[10px] text-muted-foreground">
              Customer happiness score
            </p>
          </div>
        </div>

        <div className="flex items-center justify-around gap-2 my-2">
          <CircularGauge value={94} label="CSAT" color="#10B981" />
          <CircularGauge value={67} label="NPS" color="#3B82F6" />
          <CircularGauge value={88} label="CES" color="#8B5CF6" />
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <p className="text-[10px] text-muted-foreground mb-1">NPS Trend</p>
          <div className="flex items-end gap-1 h-12">
            {NPS_HISTORY.map((d, i) => (
              <div
                key={d.month}
                className="flex-1 flex flex-col items-center gap-0.5"
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${d.score}%` }}
                  transition={{
                    delay: 1 + i * 0.1,
                    duration: 0.6,
                    ease: "easeOut",
                  }}
                  className="w-full rounded-t bg-gradient-to-t from-blue-500/40 to-blue-500/80 min-h-[4px]"
                />
                <span className="text-[8px] text-muted-foreground">
                  {d.month}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ─── Emoji Feedback Distribution ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        className="glass rounded-xl p-5 gradient-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-amber-500/15">
            <Smile className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Feedback Sentiment</h3>
            <p className="text-[10px] text-muted-foreground">
              Distribution by reaction
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {FEEDBACK.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1 + idx * 0.08, duration: 0.4 }}
              className="flex items-center gap-2"
            >
              <span className="text-base w-6 text-center">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-medium">{item.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {item.count}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{
                      delay: 1.2 + idx * 0.08,
                      duration: 1,
                      ease: "easeOut",
                    }}
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground">Total responses</p>
            <p className="text-sm font-semibold">1,285</p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">
            <TrendingUp className="w-2.5 h-2.5" />
            +8.4% MoM
          </div>
        </div>
      </motion.div>

      {/* ─── Recent Reviews ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        className="glass rounded-xl p-5 gradient-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-cyan-500/15">
            <MessageCircle className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Recent Reviews</h3>
            <p className="text-[10px] text-muted-foreground">
              Customer feedback
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {REVIEWS.map((review, idx) => (
            <motion.div
              key={review.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + idx * 0.1, duration: 0.4 }}
              className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
            >
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {review.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium truncate">
                      {review.name}
                    </p>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-2.5 h-2.5 ${
                            i < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-zinc-600"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    {review.text}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[9px] text-muted-foreground">
                      {review.date}
                    </span>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                        review.sentiment === "positive"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : review.sentiment === "neutral"
                            ? "bg-yellow-500/15 text-yellow-400"
                            : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {review.sentiment}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-3 py-1.5 rounded-lg text-[10px] font-semibold
            bg-gradient-to-r from-cyan-500/15 to-blue-500/15
            border border-cyan-500/20 text-cyan-400
            hover:from-cyan-500/25 hover:to-blue-500/25 transition-all flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3 h-3" />
          View All Reviews
        </motion.button>
      </motion.div>
    </div>
  );
}
