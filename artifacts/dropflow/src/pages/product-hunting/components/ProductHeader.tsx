import { motion } from "framer-motion";
import { Search, Sparkles, Rocket, TrendingUp } from "lucide-react";

export default function ProductHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
        boxShadow: "0 0 30px rgba(139, 92, 246, 0.3), 0 0 60px rgba(59, 130, 246, 0.15)",
      }}
    >
      {/* Animated background orbs */}
      <motion.div
        className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #22D3EE, transparent)" }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, #fff, transparent)" }}
        animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Rocket className="w-5 h-5 text-white/80" />
            </motion.div>
            <span className="text-white/70 text-sm font-medium tracking-wide uppercase">
              DropFlow Intelligence
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Product Hunting
          </h1>
          <motion.p
            className="text-white/60 text-sm md:text-base max-w-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Discover trending products, analyze margins, and identify winning
            dropshipping opportunities with AI-powered insights.
          </motion.p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              bg-white/15 text-white backdrop-blur-sm border border-white/20
              hover:bg-white/25 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            AI Scan
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              bg-white text-[#6C3AE0] hover:bg-white/90 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Analyze Market
          </motion.button>
        </div>
      </div>

      {/* Bottom gradient bar */}
      <div className="h-1 w-full gradient-accent-bar opacity-60" />
    </motion.div>
  );
}