import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  ChevronDown,
  ChevronUp,
  MapPin,
  Crown,
  Star,
  AlertTriangle,
  UserCheck,
  UserX,
  Heart,
  Eye,
  MessageSquare,
  Package,
  Mail,
  Calendar,
  TrendingUp,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  region: string;
  status: "vip" | "loyal" | "new" | "at-risk" | "lost";
  totalSpend: number;
  orderCount: number;
  avgOrder: number;
  ltv: number;
  rfm: { r: number; f: number; m: number };
  lastOrder: string;
  joined: string;
  satisfaction: number;
  purchases: { date: string; product: string; amount: number }[];
  avatar: string;
  engagement: "High" | "Medium" | "Low";
}

const CUSTOMERS: Customer[] = [
  {
    id: "C001",
    name: "Olivia Bennett",
    email: "olivia.b@example.com",
    region: "North America",
    status: "vip",
    totalSpend: 4280.5,
    orderCount: 18,
    avgOrder: 237.8,
    ltv: 4920,
    rfm: { r: 5, f: 5, m: 5 },
    lastOrder: "2 days ago",
    joined: "Mar 2023",
    satisfaction: 96,
    avatar: "OB",
    engagement: "High",
    purchases: [
      {
        date: "2 days ago",
        product: "Wireless ANC Earbuds Pro",
        amount: 49.99,
      },
      {
        date: "3 weeks ago",
        product: "Smart LED Strip Lights 10m",
        amount: 34.99,
      },
      {
        date: "2 months ago",
        product: "Jade Roller & Gua Sha Set",
        amount: 24.99,
      },
    ],
  },
  {
    id: "C002",
    name: "Marcus Chen",
    email: "marcus.c@example.com",
    region: "Asia",
    status: "loyal",
    totalSpend: 2150.0,
    orderCount: 12,
    avgOrder: 179.2,
    ltv: 2580,
    rfm: { r: 4, f: 5, m: 4 },
    lastOrder: "5 days ago",
    joined: "Jul 2023",
    satisfaction: 92,
    avatar: "MC",
    engagement: "High",
    purchases: [
      { date: "5 days ago", product: "Portable Blender USB-C", amount: 39.99 },
      {
        date: "1 month ago",
        product: "Car Phone Mount Magnetic",
        amount: 15.99,
      },
    ],
  },
  {
    id: "C003",
    name: "Sophia Rodriguez",
    email: "sophia.r@example.com",
    region: "Europe",
    status: "loyal",
    totalSpend: 1890.75,
    orderCount: 14,
    avgOrder: 135.1,
    ltv: 2240,
    rfm: { r: 5, f: 4, m: 4 },
    lastOrder: "1 day ago",
    joined: "Jan 2024",
    satisfaction: 94,
    avatar: "SR",
    engagement: "High",
    purchases: [
      { date: "1 day ago", product: "Yoga Resistance Band Set", amount: 19.99 },
      { date: "2 weeks ago", product: "Kinetic Sand Play Set", amount: 22.99 },
    ],
  },
  {
    id: "C004",
    name: "James Patel",
    email: "james.p@example.com",
    region: "North America",
    status: "vip",
    totalSpend: 5640.2,
    orderCount: 22,
    avgOrder: 256.4,
    ltv: 6850,
    rfm: { r: 5, f: 5, m: 5 },
    lastOrder: "Today",
    joined: "Nov 2022",
    satisfaction: 98,
    avatar: "JP",
    engagement: "High",
    purchases: [
      { date: "Today", product: "LED Face Mask Therapy", amount: 59.99 },
      { date: "1 week ago", product: "Smart Water Bottle", amount: 44.99 },
    ],
  },
  {
    id: "C005",
    name: "Aisha Khan",
    email: "aisha.k@example.com",
    region: "Asia",
    status: "new",
    totalSpend: 248.5,
    orderCount: 2,
    avgOrder: 124.3,
    ltv: 280,
    rfm: { r: 5, f: 1, m: 2 },
    lastOrder: "1 day ago",
    joined: "Dec 2025",
    satisfaction: 88,
    avatar: "AK",
    engagement: "Medium",
    purchases: [
      {
        date: "1 day ago",
        product: "Silicone Kitchen Utensil Set",
        amount: 29.99,
      },
    ],
  },
  {
    id: "C006",
    name: "Lucas Muller",
    email: "lucas.m@example.com",
    region: "Europe",
    status: "at-risk",
    totalSpend: 1245.0,
    orderCount: 8,
    avgOrder: 155.6,
    ltv: 1480,
    rfm: { r: 2, f: 3, m: 3 },
    lastOrder: "3 months ago",
    joined: "Jun 2024",
    satisfaction: 76,
    avatar: "LM",
    engagement: "Low",
    purchases: [
      {
        date: "3 months ago",
        product: "Pet Camera Treat Dispenser",
        amount: 79.99,
      },
    ],
  },
  {
    id: "C007",
    name: "Emma Thompson",
    email: "emma.t@example.com",
    region: "Oceania",
    status: "loyal",
    totalSpend: 1620.4,
    orderCount: 11,
    avgOrder: 147.3,
    ltv: 1980,
    rfm: { r: 4, f: 4, m: 4 },
    lastOrder: "4 days ago",
    joined: "Sep 2023",
    satisfaction: 91,
    avatar: "ET",
    engagement: "High",
    purchases: [
      {
        date: "4 days ago",
        product: "Magnetic Wireless Charger Stand",
        amount: 34.99,
      },
    ],
  },
  {
    id: "C008",
    name: "Diego Silva",
    email: "diego.s@example.com",
    region: "South America",
    status: "at-risk",
    totalSpend: 890.0,
    orderCount: 6,
    avgOrder: 148.3,
    ltv: 1050,
    rfm: { r: 2, f: 2, m: 3 },
    lastOrder: "2 months ago",
    joined: "Feb 2024",
    satisfaction: 72,
    avatar: "DS",
    engagement: "Low",
    purchases: [
      {
        date: "2 months ago",
        product: "UV-C Sanitizer Box Pro",
        amount: 49.99,
      },
    ],
  },
  {
    id: "C009",
    name: "Yuki Tanaka",
    email: "yuki.t@example.com",
    region: "Asia",
    status: "loyal",
    totalSpend: 2980.0,
    orderCount: 16,
    avgOrder: 186.3,
    ltv: 3450,
    rfm: { r: 5, f: 5, m: 4 },
    lastOrder: "2 days ago",
    joined: "Apr 2023",
    satisfaction: 95,
    avatar: "YT",
    engagement: "High",
    purchases: [
      {
        date: "2 days ago",
        product: "Smart LED Strip Lights 10m",
        amount: 34.99,
      },
    ],
  },
  {
    id: "C010",
    name: "Noah Williams",
    email: "noah.w@example.com",
    region: "Africa",
    status: "new",
    totalSpend: 165.0,
    orderCount: 1,
    avgOrder: 165.0,
    ltv: 180,
    rfm: { r: 4, f: 1, m: 1 },
    lastOrder: "5 days ago",
    joined: "Jan 2026",
    satisfaction: 82,
    avatar: "NW",
    engagement: "Medium",
    purchases: [
      {
        date: "5 days ago",
        product: "Car Phone Mount Magnetic",
        amount: 15.99,
      },
    ],
  },
  {
    id: "C011",
    name: "Isabella Garcia",
    email: "isabella.g@example.com",
    region: "North America",
    status: "vip",
    totalSpend: 3850.0,
    orderCount: 15,
    avgOrder: 256.7,
    ltv: 4520,
    rfm: { r: 5, f: 4, m: 5 },
    lastOrder: "3 days ago",
    joined: "May 2023",
    satisfaction: 97,
    avatar: "IG",
    engagement: "High",
    purchases: [
      { date: "3 days ago", product: "LED Face Mask Therapy", amount: 59.99 },
    ],
  },
  {
    id: "C012",
    name: "Ethan Brown",
    email: "ethan.b@example.com",
    region: "Europe",
    status: "lost",
    totalSpend: 320.0,
    orderCount: 3,
    avgOrder: 106.7,
    ltv: 320,
    rfm: { r: 1, f: 1, m: 1 },
    lastOrder: "6 months ago",
    joined: "Oct 2024",
    satisfaction: 58,
    avatar: "EB",
    engagement: "Low",
    purchases: [
      {
        date: "6 months ago",
        product: "Yoga Resistance Band Set",
        amount: 19.99,
      },
    ],
  },
];

const STATUS_CONFIG = {
  vip: {
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
    border: "border-yellow-500/20",
    icon: Crown,
    label: "VIP",
  },
  loyal: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/20",
    icon: Star,
    label: "Loyal",
  },
  new: {
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/20",
    icon: UserCheck,
    label: "New",
  },
  "at-risk": {
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/20",
    icon: AlertTriangle,
    label: "At Risk",
  },
  lost: {
    bg: "bg-zinc-500/15",
    text: "text-zinc-400",
    border: "border-zinc-500/20",
    icon: UserX,
    label: "Lost",
  },
} as const;

function StatusBadge({ status }: { status: Customer["status"] }) {
  const c = STATUS_CONFIG[status];
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.text} border ${c.border}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {c.label}
    </span>
  );
}

function SatisfactionBar({ value }: { value: number }) {
  const color =
    value >= 90
      ? "from-emerald-500 to-cyan-400"
      : value >= 75
        ? "from-blue-500 to-violet-500"
        : value >= 60
          ? "from-amber-500 to-orange-500"
          : "from-red-500 to-rose-500";
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
        />
      </div>
      <span className="text-[10px] font-mono font-semibold w-7 text-right">
        {value}
      </span>
    </div>
  );
}

function RfmScore({ score }: { score: number }) {
  const color =
    score >= 4
      ? "bg-emerald-500/20 text-emerald-400"
      : score >= 3
        ? "bg-blue-500/20 text-blue-400"
        : score >= 2
          ? "bg-amber-500/20 text-amber-400"
          : "bg-red-500/20 text-red-400";
  return (
    <span
      className={`w-6 h-6 inline-flex items-center justify-center rounded font-bold text-xs ${color}`}
    >
      {score}
    </span>
  );
}

function avatarColor(name: string) {
  const colors = [
    "from-blue-500/30 to-violet-500/30",
    "from-emerald-500/30 to-cyan-500/30",
    "from-pink-500/30 to-rose-500/30",
    "from-amber-500/30 to-orange-500/30",
    "from-violet-500/30 to-purple-500/30",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

interface CustomerTableProps {
  search: string;
  selectedRegion: string;
  selectedSpend: number;
  selectedEngagement: string;
  sortBy: string;
}

const SPEND_RANGES = [
  { label: "All Spend", min: 0, max: 100000 },
  { label: "Under $100", min: 0, max: 100 },
  { label: "$100 - $500", min: 100, max: 500 },
  { label: "$500 - $1,000", min: 500, max: 1000 },
  { label: "Over $1,000", min: 1000, max: 100000 },
];

export default function CustomerTable({
  search,
  selectedRegion,
  selectedSpend,
  selectedEngagement,
  sortBy,
}: CustomerTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const range = SPEND_RANGES[selectedSpend] ?? SPEND_RANGES[0];
    const list = CUSTOMERS.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q);
      const matchesRegion =
        selectedRegion === "All" || c.region === selectedRegion;
      const matchesSpend =
        c.totalSpend >= range.min && c.totalSpend < range.max;
      const matchesEngagement =
        selectedEngagement === "All" || c.engagement === selectedEngagement;
      return (
        matchesSearch && matchesRegion && matchesSpend && matchesEngagement
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === "ltv") return b.ltv - a.ltv;
      if (sortBy === "orders") return b.orderCount - a.orderCount;
      if (sortBy === "spend") return b.totalSpend - a.totalSpend;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.lastOrder.localeCompare(b.lastOrder);
    });
  }, [search, selectedRegion, selectedSpend, selectedEngagement, sortBy]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      className="glass rounded-xl gradient-border overflow-hidden"
    >
      <div className="p-4 pb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/15">
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Customer Directory</h3>
            <p className="text-[10px] text-muted-foreground">
              Showing {filtered.length} of {CUSTOMERS.length} customers
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="w-8"></th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Customer
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Region
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                RFM
              </th>
              <th className="text-right px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Orders
              </th>
              <th className="text-right px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                LTV
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Satisfaction
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Last Order
              </th>
              <th className="text-center px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((customer, idx) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                idx={idx}
                isExpanded={expandedId === customer.id}
                isFavorite={favorites.has(customer.id)}
                onToggleExpand={() =>
                  setExpandedId(expandedId === customer.id ? null : customer.id)
                }
                onToggleFav={() => toggleFav(customer.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function CustomerRow({
  customer,
  idx,
  isExpanded,
  isFavorite,
  onToggleExpand,
  onToggleFav,
}: {
  customer: Customer;
  idx: number;
  isExpanded: boolean;
  isFavorite: boolean;
  onToggleExpand: () => void;
  onToggleFav: () => void;
}) {
  return (
    <>
      <motion.tr
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05 + idx * 0.03, duration: 0.3 }}
        onClick={onToggleExpand}
        className={`border-b border-white/[0.03] transition-colors cursor-pointer ${
          isExpanded ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
        }`}
      >
        <td className="px-2 py-3">
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(customer.name)} flex items-center justify-center text-[10px] font-bold text-foreground`}
            >
              {customer.avatar}
            </div>
            <div>
              <p className="font-medium text-foreground">{customer.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {customer.email}
              </p>
            </div>
          </div>
        </td>
        <td className="px-3 py-3">
          <StatusBadge status={customer.status} />
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-2.5 h-2.5" />
            {customer.region}
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1">
            <RfmScore score={customer.rfm.r} />
            <RfmScore score={customer.rfm.f} />
            <RfmScore score={customer.rfm.m} />
          </div>
        </td>
        <td className="px-3 py-3 text-right font-mono">
          {customer.orderCount}
        </td>
        <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-400">
          ${customer.ltv.toLocaleString()}
        </td>
        <td className="px-3 py-3">
          <SatisfactionBar value={customer.satisfaction} />
        </td>
        <td className="px-3 py-3 text-muted-foreground">
          {customer.lastOrder}
        </td>
        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1">
            <motion.button
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleFav}
              className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors"
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  isFavorite
                    ? "fill-red-400 text-red-400"
                    : "text-muted-foreground"
                }`}
              />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors text-muted-foreground"
            >
              <Eye className="w-3.5 h-3.5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors text-muted-foreground"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </td>
      </motion.tr>
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white/[0.02]"
          >
            <td colSpan={10} className="px-3 py-4">
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-4"
              >
                {/* Customer details */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Customer Details
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {customer.email}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {customer.region}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Joined {customer.joined}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="w-3 h-3" />
                      {customer.orderCount} orders · $
                      {customer.avgOrder.toFixed(2)} avg
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <TrendingUp className="w-3 h-3" />$
                      {customer.totalSpend.toLocaleString()} total spend
                    </div>
                  </div>
                </div>

                {/* Purchase history */}
                <div className="space-y-2 lg:col-span-2">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Recent Purchase History
                  </h4>
                  <div className="space-y-1.5">
                    {customer.purchases.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center shrink-0">
                            <Package className="w-3 h-3 text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              {p.product}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {p.date}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-semibold text-emerald-400 shrink-0 ml-2">
                          ${p.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}
