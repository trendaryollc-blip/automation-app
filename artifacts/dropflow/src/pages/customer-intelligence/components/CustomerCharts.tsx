import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  BarChart3,
} from "lucide-react";
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
  BarChart,
  Bar,
  Legend,
} from "recharts";

/* ─── LTV Trend Data ─── */
const ltvData = [
  { month: "Jan", ltv: 220, newCustomers: 68, returning: 152 },
  { month: "Feb", ltv: 245, newCustomers: 78, returning: 167 },
  { month: "Mar", ltv: 268, newCustomers: 85, returning: 183 },
  { month: "Apr", ltv: 290, newCustomers: 92, returning: 198 },
  { month: "May", ltv: 310, newCustomers: 105, returning: 205 },
  { month: "Jun", ltv: 325, newCustomers: 118, returning: 207 },
  { month: "Jul", ltv: 332, newCustomers: 124, returning: 208 },
  { month: "Aug", ltv: 340, newCustomers: 132, returning: 208 },
  { month: "Sep", ltv: 345, newCustomers: 138, returning: 207 },
  { month: "Oct", ltv: 347, newCustomers: 145, returning: 202 },
  { month: "Nov", ltv: 348, newCustomers: 152, returning: 196 },
  { month: "Dec", ltv: 349, newCustomers: 158, returning: 191 },
];

/* ─── RFM Segment Pie Data ─── */
const rfmData = [
  { name: "Champions", value: 186, color: "#10B981" },
  { name: "Loyal", value: 248, color: "#3B82F6" },
  { name: "Promising", value: 162, color: "#22D3EE" },
  { name: "New", value: 134, color: "#8B5CF6" },
  { name: "Needs Attention", value: 198, color: "#F59E0B" },
  { name: "At Risk", value: 156, color: "#EF4444" },
  { name: "Can't Lose", value: 88, color: "#DC2626" },
  { name: "Lost", value: 112, color: "#71717A" },
];

/* ─── Retention Cohort Data ─── */
const retentionData = [
  { cohort: "Jan", m1: 100, m2: 82, m3: 74, m4: 68, m5: 63, m6: 60 },
  { cohort: "Feb", m1: 100, m2: 85, m3: 76, m4: 70, m5: 65, m6: 61 },
  { cohort: "Mar", m1: 100, m2: 88, m3: 79, m4: 73, m5: 68, m6: 65 },
  { cohort: "Apr", m1: 100, m2: 84, m3: 78, m4: 72, m5: 67, m6: 64 },
  { cohort: "May", m1: 100, m2: 87, m3: 80, m4: 75, m5: 70, m6: 66 },
  { cohort: "Jun", m1: 100, m2: 90, m3: 83, m4: 78, m5: 73, m6: 70 },
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
          <span className="font-semibold">
            {typeof entry.value === "number" && entry.value > 100
              ? `$${entry.value}`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
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

export default function CustomerCharts() {
  const [activeTab, setActiveTab] = useState<"rfm" | "retention">("rfm");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* ─── LTV Trend Chart ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="lg:col-span-3 glass rounded-xl p-5 gradient-border"
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-500/15">
              <TrendingUp className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                Customer Lifetime Value Trend
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Monthly LTV growth & customer composition
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500" /> LTV
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-500" /> New
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Returning
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <AreaChart
            data={ltvData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradLtv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradReturning" x1="0" y1="0" x2="0" y2="1">
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
              dataKey="ltv"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              fill="url(#gradLtv)"
              dot={false}
              animationDuration={2000}
            />
            <Area
              type="monotone"
              dataKey="newCustomers"
              stroke="#22D3EE"
              strokeWidth={2}
              fill="url(#gradNew)"
              dot={false}
              animationDuration={2000}
              animationBegin={300}
            />
            <Area
              type="monotone"
              dataKey="returning"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#gradReturning)"
              dot={false}
              animationDuration={2000}
              animationBegin={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ─── RFM / Retention Chart ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="lg:col-span-2 glass rounded-xl p-5 gradient-border"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/15">
              {activeTab === "rfm" ? (
                <PieIcon className="w-4 h-4 text-blue-400" />
              ) : (
                <BarChart3 className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                {activeTab === "rfm" ? "RFM Segmentation" : "Retention Cohorts"}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {activeTab === "rfm"
                  ? "Customer distribution by segment"
                  : "% retained by cohort"}
              </p>
            </div>
          </div>
          <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-md p-0.5">
            <button
              onClick={() => setActiveTab("rfm")}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${
                activeTab === "rfm"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              RFM
            </button>
            <button
              onClick={() => setActiveTab("retention")}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${
                activeTab === "retention"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Retention
            </button>
          </div>
        </div>

        {activeTab === "rfm" ? (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={rfmData}
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={38}
                  paddingAngle={2}
                  dataKey="value"
                  label={renderCustomLabel}
                  labelLine={false}
                  animationDuration={1500}
                  animationBegin={400}
                >
                  {rfmData.map((entry) => (
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
                          {d.value} customers
                        </span>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {rfmData.map((seg) => (
                <div
                  key={seg.name}
                  className="flex items-center gap-1.5 text-[10px]"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: seg.color }}
                  />
                  <span className="text-muted-foreground truncate">
                    {seg.name}
                  </span>
                  <span className="ml-auto font-mono font-semibold text-foreground">
                    {seg.value}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart
              data={retentionData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="cohort"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar
                dataKey="m1"
                fill="#3B82F6"
                radius={[3, 3, 0, 0]}
                animationDuration={1500}
              />
              <Bar
                dataKey="m3"
                fill="#8B5CF6"
                radius={[3, 3, 0, 0]}
                animationDuration={1500}
                animationBegin={200}
              />
              <Bar
                dataKey="m6"
                fill="#22D3EE"
                radius={[3, 3, 0, 0]}
                animationDuration={1500}
                animationBegin={400}
              />
              <Legend
                iconSize={8}
                wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }}
                formatter={(value) =>
                  value === "m1"
                    ? "Month 1"
                    : value === "m3"
                      ? "Month 3"
                      : "Month 6"
                }
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}
