import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  DollarSign,
  Crown,
  Heart,
  BarChart3,
} from "lucide-react";

/* ─── Animated Counter Hook ─── */
function useAnimatedNumber(value: number, duration = 1200) {
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
  decimals?: number;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 28;
  const width = 60;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

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

function KpiCard({
  label,
  value,
  prefix = "",
  suffix = "",
  change,
  icon,
  color,
  delay,
  sparkline,
  decimals = 0,
}: KpiCardProps) {
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
        {sparkline && <MiniSparkline data={sparkline} color={color} />}
      </div>

      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums">
        {prefix}
        {decimals > 0 ? animatedValue.toFixed(decimals) : Math.round(animatedValue).toLocaleString()}
        {suffix && (
          <span className="text-base font-normal text-muted-foreground ml-0.5">
            {suffix}
          </span>
        )}
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
        <span className="text-[10px] text-muted-foreground">vs last month</span>
      </div>
    </motion.div>
  );
}

const KPI_DATA = [
  {
    label: "Total Customers",
    value: 1284,
    prefix: "",
    suffix: "",
    change: 12.5,
    icon: <Users className="w-4 h-4" />,
    color: "#3B82F6",
    sparkline: [800, 850, 920, 980, 1050, 1100, 1150, 1200, 1230, 1260, 1270, 1280, 1284],
  },
  {
    label: "Total Revenue",
    value: 89420,
    prefix: "$",
    suffix: "",
    change: 18.2,
    icon: <DollarSign className="w-4 h-4" />,
    color: "#10B981",
    sparkline: [40, 48, 55, 62, 70, 68, 75, 82, 88, 85, 89, 92, 95],
  },
  {
    label: "Avg LTV",
    value: 348.5,
    prefix: "$",
    suffix: "",
    change: 7.4,
    icon: <BarChart3 className="w-4 h-4" />,
    color: "#8B5CF6",
    decimals: 2,
    sparkline: [220, 240, 260, 280, 290, 310, 320, 330, 335, 340, 345, 347, 348],
  },
  {
    label: "VIP Customers",
    value: 86,
    prefix: "",
    suffix: "",
    change: 9.8,
    icon: <Crown className="w-4 h-4" />,
    color: "#F59E0B",
    sparkline: [42, 48, 52, 58, 63, 68, 72, 76, 80, 82, 84, 85, 86],
  },
];

export default function CustomerStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {KPI_DATA.map((kpi, i) => (
        <KpiCard key={kpi.label} {...kpi} delay={0.1 + i * 0.1} />
      ))}
    </div>
  );
}
