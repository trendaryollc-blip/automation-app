import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Package,
  TrendingUp,
  Percent,
  Star,
  DollarSign,
  Target,
  Zap,
  BarChart3,
} from "lucide-react";

/* ─── Animated Counter Hook ─── */
function useAnimatedNumber(value: number, duration = 1200) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (Math.abs(diff) < 0.01) { setDisplay(value); return; }
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

interface KpiCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change: number;
  icon: React.ReactNode;
  color: string;
  delay: number;
  sparkline?: number[];
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 28;
  const width = 60;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KpiCard({ label, value, prefix = "", suffix = "", change, icon, color, delay, sparkline }: KpiCardProps) {
  const animatedValue = useAnimatedNumber(value);
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className="kpi-card glass rounded-xl p-4 md:p-5 gradient-border group cursor-default"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="p-2 rounded-lg transition-colors duration-300"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        {sparkline && (
          <MiniSparkline data={sparkline} color={color} />
        )}
      </div>

      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums">
        {prefix}
        {suffix === "%" || suffix === "x"
          ? animatedValue.toFixed(1)
          : Math.round(animatedValue).toLocaleString()}
        <span className="text-base font-normal text-muted-foreground ml-0.5">{suffix}</span>
      </p>

      <div className="flex items-center gap-1.5 mt-2">
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
            isPositive
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-red-500/15 text-red-400"
          }`}
        >
          <TrendingUp className={`w-3 h-3 ${!isPositive ? "rotate-180" : ""}`} />
          {Math.abs(change).toFixed(1)}%
        </span>
        <span className="text-[10px] text-muted-foreground">vs last week</span>
      </div>
    </motion.div>
  );
}

const KPI_DATA = [
  {
    label: "Total Products",
    value: 1284,
    prefix: "",
    suffix: "",
    change: 12.5,
    icon: <Package className="w-4 h-4" />,
    color: "#3B82F6",
    sparkline: [40, 52, 48, 61, 55, 70, 65, 78, 82, 90, 88, 95, 100, 108],
  },
  {
    label: "Avg Margin",
    value: 34.7,
    prefix: "",
    suffix: "%",
    change: 3.2,
    icon: <Percent className="w-4 h-4" />,
    color: "#8B5CF6",
    sparkline: [28, 30, 32, 29, 33, 31, 35, 34, 36, 33, 35, 34, 35, 34],
  },
  {
    label: "Top Category",
    value: 486,
    prefix: "",
    suffix: "",
    change: 8.7,
    icon: <Star className="w-4 h-4" />,
    color: "#22D3EE",
    sparkline: [30, 35, 32, 40, 38, 45, 42, 50, 48, 55, 52, 58, 56, 60],
  },
  {
    label: "Revenue Potential",
    value: 89420,
    prefix: "$",
    suffix: "",
    change: 15.3,
    icon: <DollarSign className="w-4 h-4" />,
    color: "#10B981",
    sparkline: [500, 600, 550, 700, 680, 800, 750, 900, 850, 1000, 950, 1100, 1050, 1200],
  },
];

export default function ProductStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {KPI_DATA.map((kpi, i) => (
        <KpiCard key={kpi.label} {...kpi} delay={0.1 + i * 0.1} />
      ))}
    </div>
  );
}