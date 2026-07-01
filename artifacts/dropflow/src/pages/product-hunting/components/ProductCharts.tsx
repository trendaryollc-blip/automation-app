import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, PieChart as PieIcon, BarChart3 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

/* ─── Trend Line Chart Data ─── */
const trendData = [
  { month: "Jan", discovered: 42, sourced: 28, launched: 15 },
  { month: "Feb", discovered: 58, sourced: 35, launched: 22 },
  { month: "Mar", discovered: 65, sourced: 42, launched: 30 },
  { month: "Apr", discovered: 78, sourced: 51, launched: 35 },
  { month: "May", discovered: 92, sourced: 63, launched: 44 },
  { month: "Jun", discovered: 110, sourced: 78, launched: 55 },
  { month: "Jul", discovered: 128, sourced: 89, launched: 67 },
  { month: "Aug", discovered: 145, sourced: 102, launched: 78 },
  { month: "Sep", discovered: 132, sourced: 95, launched: 72 },
  { month: "Oct", discovered: 158, sourced: 118, launched: 88 },
  { month: "Nov", discovered: 172, sourced: 132, launched: 98 },
  { month: "Dec", discovered: 195, sourced: 148, launched: 112 },
];

/* ─── Category Pie Chart Data ─── */
const categoryData = [
  { name: "Electronics", value: 384, color: "#3B82F6" },
  { name: "Home & Garden", value: 256, color: "#8B5CF6" },
  { name: "Beauty", value: 198, color: "#22D3EE" },
  { name: "Fashion", value: 165, color: "#10B981" },
  { name: "Sports", value: 142, color: "#F59E0B" },
  { name: "Other", value: 139, color: "#EF4444" },
];

/* ─── Custom Tooltip ─── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg p-3 border border-white/[0.1] shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground capitalize">
            {entry.dataKey}:
          </span>
          <span className="font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Custom Pie Label ─── */
function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.08) return null;

  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[10px] font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function ProductCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* ─── Line / Area Chart ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="lg:col-span-3 glass rounded-xl p-5 gradient-border"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/15">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Product Discovery Trend</h3>
              <p className="text-[10px] text-muted-foreground">
                Monthly pipeline performance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Discovered
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500" /> Sourced
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Launched
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <AreaChart
            data={trendData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradDiscovered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSourced" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradLaunched" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="discovered"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#gradDiscovered)"
              dot={false}
              animationDuration={2000}
            />
            <Area
              type="monotone"
              dataKey="sourced"
              stroke="#8B5CF6"
              strokeWidth={2}
              fill="url(#gradSourced)"
              dot={false}
              animationDuration={2000}
              animationBegin={300}
            />
            <Area
              type="monotone"
              dataKey="launched"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#gradLaunched)"
              dot={false}
              animationDuration={2000}
              animationBegin={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ─── Pie Chart ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="lg:col-span-2 glass rounded-xl p-5 gradient-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-violet-500/15">
            <PieIcon className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Category Distribution</h3>
            <p className="text-[10px] text-muted-foreground">
              Products by category
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              paddingAngle={3}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
              animationDuration={1500}
              animationBegin={400}
            >
              {categoryData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="glass rounded-lg p-2.5 border border-white/[0.1] shadow-xl text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: d.color }}
                      />
                      <span className="font-semibold">{d.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {d.value} products
                    </span>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          {categoryData.map((cat) => (
            <div
              key={cat.name}
              className="flex items-center gap-1.5 text-[10px]"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: cat.color }}
              />
              <span className="text-muted-foreground truncate">{cat.name}</span>
              <span className="ml-auto font-mono font-semibold text-foreground">
                {cat.value}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
