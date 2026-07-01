import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Star,
  MoreHorizontal,
  Eye,
  ShoppingCart,
  Heart,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

/* ─── Product Data ─── */
interface Product {
  id: string;
  name: string;
  category: string;
  supplier: string;
  costPrice: number;
  sellPrice: number;
  margin: number;
  trendingScore: number;
  status: "hot" | "rising" | "stable" | "declining";
  rating: number;
  orders: number;
  image: string;
}

const PRODUCTS: Product[] = [
  {
    id: "P001",
    name: "Wireless ANC Earbuds Pro",
    category: "Electronics",
    supplier: "TechSource CN",
    costPrice: 12.5,
    sellPrice: 49.99,
    margin: 75,
    trendingScore: 94,
    status: "hot",
    rating: 4.8,
    orders: 2840,
    image: "🎧",
  },
  {
    id: "P002",
    name: "Smart LED Strip Lights 10m",
    category: "Home & Garden",
    supplier: "SmartHome Ltd",
    costPrice: 8.2,
    sellPrice: 34.99,
    margin: 76.6,
    trendingScore: 88,
    status: "hot",
    rating: 4.6,
    orders: 1920,
    image: "💡",
  },
  {
    id: "P003",
    name: "Jade Roller & Gua Sha Set",
    category: "Beauty",
    supplier: "BeautyDrop Co",
    costPrice: 3.8,
    sellPrice: 24.99,
    margin: 84.8,
    trendingScore: 82,
    status: "rising",
    rating: 4.7,
    orders: 3100,
    image: "✨",
  },
  {
    id: "P004",
    name: "Portable Blender USB-C",
    category: "Electronics",
    supplier: "GadgetWorld",
    costPrice: 9.5,
    sellPrice: 39.99,
    margin: 76.2,
    trendingScore: 79,
    status: "rising",
    rating: 4.5,
    orders: 1580,
    image: "🔌",
  },
  {
    id: "P005",
    name: "Pet Camera Treat Dispenser",
    category: "Pet Supplies",
    supplier: "PetTech Asia",
    costPrice: 22.0,
    sellPrice: 79.99,
    margin: 72.5,
    trendingScore: 76,
    status: "rising",
    rating: 4.4,
    orders: 890,
    image: "📷",
  },
  {
    id: "P006",
    name: "Yoga Resistance Band Set",
    category: "Sports",
    supplier: "FitGear Pro",
    costPrice: 4.2,
    sellPrice: 19.99,
    margin: 79,
    trendingScore: 71,
    status: "stable",
    rating: 4.3,
    orders: 2200,
    image: "🏋️",
  },
  {
    id: "P007",
    name: "Car Phone Mount Magnetic",
    category: "Automotive",
    supplier: "AutoParts CN",
    costPrice: 2.8,
    sellPrice: 15.99,
    margin: 82.5,
    trendingScore: 65,
    status: "stable",
    rating: 4.2,
    orders: 4100,
    image: "📱",
  },
  {
    id: "P008",
    name: "Kinetic Sand Play Set",
    category: "Toys",
    supplier: "ToyDrop Global",
    costPrice: 5.5,
    sellPrice: 22.99,
    margin: 76.1,
    trendingScore: 58,
    status: "stable",
    rating: 4.1,
    orders: 1340,
    image: "🧸",
  },
  {
    id: "P009",
    name: "Silicone Kitchen Utensil Set",
    category: "Home & Garden",
    supplier: "HomeEssentials",
    costPrice: 6.8,
    sellPrice: 29.99,
    margin: 77.3,
    trendingScore: 52,
    status: "declining",
    rating: 4.0,
    orders: 2650,
    image: "🍳",
  },
  {
    id: "P010",
    name: "LED Face Mask Therapy",
    category: "Beauty",
    supplier: "BeautyDrop Co",
    costPrice: 15.0,
    sellPrice: 59.99,
    margin: 75,
    trendingScore: 45,
    status: "declining",
    rating: 3.9,
    orders: 720,
    image: "🎭",
  },
];

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: Product["status"] }) {
  const config = {
    hot: {
      bg: "bg-red-500/15",
      text: "text-red-400",
      border: "border-red-500/20",
      label: "🔥 Hot",
    },
    rising: {
      bg: "bg-emerald-500/15",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      label: "📈 Rising",
    },
    stable: {
      bg: "bg-blue-500/15",
      text: "text-blue-400",
      border: "border-blue-500/20",
      label: "➡️ Stable",
    },
    declining: {
      bg: "bg-amber-500/15",
      text: "text-amber-400",
      border: "border-amber-500/20",
      label: "📉 Declining",
    },
  };
  const c = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.text} border ${c.border}`}
    >
      {c.label}
    </span>
  );
}

/* ─── Margin Bar ─── */
function MarginBar({ margin }: { margin: number }) {
  const getColor = (m: number) => {
    if (m >= 75)
      return {
        bar: "from-emerald-500 to-cyan-400",
        glow: "shadow-[0_0_8px_rgba(16,185,129,0.3)]",
      };
    if (m >= 50)
      return {
        bar: "from-blue-500 to-violet-500",
        glow: "shadow-[0_0_8px_rgba(59,130,246,0.3)]",
      };
    if (m >= 30)
      return {
        bar: "from-amber-500 to-orange-500",
        glow: "shadow-[0_0_8px_rgba(245,158,11,0.3)]",
      };
    return {
      bar: "from-red-500 to-rose-500",
      glow: "shadow-[0_0_8px_rgba(239,68,68,0.3)]",
    };
  };
  const colors = getColor(margin);
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${margin}%` }}
          transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${colors.bar} ${colors.glow}`}
        />
      </div>
      <span className="text-[10px] font-mono font-semibold w-8 text-right">
        {margin}%
      </span>
    </div>
  );
}

/* ─── Trending Score Badge ─── */
function TrendingBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-red-400"
      : score >= 60
        ? "text-emerald-400"
        : score >= 40
          ? "text-blue-400"
          : "text-muted-foreground";
  return (
    <div className="flex items-center gap-1">
      <TrendingUp className={`w-3 h-3 ${color}`} />
      <span className={`text-xs font-mono font-semibold ${color}`}>
        {score}
      </span>
    </div>
  );
}

export default function ProductTable() {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      className="glass rounded-xl gradient-border overflow-hidden"
    >
      <div className="p-4 pb-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/15">
            <Package className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Product Rankings</h3>
            <p className="text-[10px] text-muted-foreground">
              Top products by trending score
            </p>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {PRODUCTS.length} products
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Product
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Category
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Cost
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Price
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Margin
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Trend
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Orders
              </th>
              <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map((product, idx) => (
              <motion.tr
                key={product.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + idx * 0.05, duration: 0.3 }}
                onMouseEnter={() => setHoveredRow(product.id)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`border-b border-white/[0.03] transition-colors cursor-pointer ${
                  hoveredRow === product.id ? "bg-white/[0.03]" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{product.image}</span>
                    <div>
                      <p className="font-medium text-foreground">
                        {product.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {product.supplier}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {product.category}
                </td>
                <td className="px-4 py-3 font-mono">
                  ${product.costPrice.toFixed(2)}
                </td>
                <td className="px-4 py-3 font-mono font-semibold">
                  ${product.sellPrice.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <MarginBar margin={product.margin} />
                </td>
                <td className="px-4 py-3">
                  <TrendingBadge score={product.trendingScore} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={product.status} />
                </td>
                <td className="px-4 py-3 font-mono">
                  {product.orders.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <motion.button
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleFav(product.id)}
                      className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 transition-colors ${
                          favorites.has(product.id)
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
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
