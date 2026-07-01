import { motion } from "framer-motion";
import { Users, Sparkles, Brain, Heart, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

interface CustomerHeaderProps {
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export default function CustomerHeader({ theme, toggleTheme }: CustomerHeaderProps) {
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    const target = 1284;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 60));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      setLiveCount(current);
    }, 16);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
        boxShadow:
          "0 0 30px rgba(139, 92, 246, 0.3), 0 0 60px rgba(59, 130, 246, 0.15)",
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
      <motion.div
        className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #10B981, transparent)" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.18, 0.1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Users className="w-5 h-5 text-white/80" />
            </motion.div>
            <span className="text-white/70 text-sm font-medium tracking-wide uppercase">
              DropFlow Intelligence
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-100 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse-dot" />
              LIVE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Customer Intelligence
          </h1>
          <motion.p
            className="text-white/60 text-sm md:text-base max-w-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Unlock deep insights into customer behavior, RFM segmentation, lifetime
            value trends, and AI-powered retention strategies.
          </motion.p>

          <div className="flex items-center gap-4 mt-3 text-xs text-white/70">
            <span className="flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              {liveCount.toLocaleString()} customers tracked
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="w-3 h-3 text-pink-300" />
              94% satisfaction
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 rounded-xl text-white bg-white/10 backdrop-blur-sm border border-white/20
              hover:bg-white/20 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              bg-white/15 text-white backdrop-blur-sm border border-white/20
              hover:bg-white/25 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            AI Insights
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              bg-white text-[#6C3AE0] hover:bg-white/90 transition-colors"
          >
            <Brain className="w-4 h-4" />
            Predict Churn
          </motion.button>
        </div>
      </div>

      {/* Bottom gradient bar */}
      <div className="h-1 w-full gradient-accent-bar opacity-60" />
    </motion.div>
  );
}
