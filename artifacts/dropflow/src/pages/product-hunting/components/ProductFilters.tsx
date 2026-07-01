import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  Sparkles,
  ArrowUpDown,
  Filter,
  Tag,
} from "lucide-react";

const CATEGORIES = [
  "All",
  "Electronics",
  "Home & Garden",
  "Beauty",
  "Fashion",
  "Sports",
  "Toys",
  "Pet Supplies",
  "Automotive",
];

const MARGIN_RANGES = [
  { label: "All Margins", min: 0, max: 100 },
  { label: "Under 20%", min: 0, max: 20 },
  { label: "20% – 40%", min: 20, max: 40 },
  { label: "40% – 60%", min: 40, max: 60 },
  { label: "Over 60%", min: 60, max: 100 },
];

const SORT_OPTIONS = [
  { label: "Trending Score", value: "trending" },
  { label: "Highest Margin", value: "margin" },
  { label: "Most Profitable", value: "profit" },
  { label: "Newest Added", value: "newest" },
  { label: "Best Rating", value: "rating" },
];

const AI_SUGGESTIONS = [
  "wireless earbuds with high margin",
  "trending pet gadgets 2026",
  "home automation bestsellers",
  "beauty tools under $20",
  "fitness accessories trending",
];

export default function ProductFilters({
  search,
  setSearch,
  selectedCategory,
  setSelectedCategory,
  selectedMargin,
  setSelectedMargin,
  sortBy,
  setSortBy,
}: {
  search: string;
  setSearch: (v: string) => void;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedMargin: number;
  setSelectedMargin: (v: number) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredSuggestions = AI_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase()),
  );

  const activeFilters = [
    selectedCategory !== "All" && { key: "cat", label: selectedCategory },
    selectedMargin > 0 && {
      key: "margin",
      label: MARGIN_RANGES[selectedMargin]?.label ?? "",
    },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="glass rounded-xl p-4 gradient-border space-y-4"
    >
      {/* Search bar row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* AI Search */}
        <div ref={searchRef} className="relative flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder='Search products... (try "wireless earbuds")'
              className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]
                text-sm text-foreground placeholder:text-muted-foreground/50
                focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20
                transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* AI Suggestions dropdown */}
          <AnimatePresence>
            {showSuggestions && !search && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg glass border border-white/[0.08] p-2 shadow-xl"
              >
                <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                  <Sparkles className="w-3 h-3 text-violet-400" />
                  <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
                    AI Suggestions
                  </span>
                </div>
                {AI_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSearch(s);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-md text-xs text-muted-foreground
                      hover:bg-white/[0.05] hover:text-foreground transition-colors flex items-center gap-2"
                  >
                    <Search className="w-3 h-3 opacity-40" />
                    {s}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sort dropdown */}
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]
              text-sm text-muted-foreground hover:border-white/[0.15] hover:text-foreground transition-all whitespace-nowrap"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Sort"}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showSortDropdown ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {showSortDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute z-50 right-0 top-full mt-1 w-48 rounded-lg glass border border-white/[0.08] p-1 shadow-xl"
              >
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSortBy(opt.value);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                      sortBy === opt.value
                        ? "bg-blue-500/15 text-blue-400"
                        : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedCategory === cat
                ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:border-white/[0.12] hover:text-foreground"
            }`}
          >
            {cat}
          </motion.button>
        ))}
      </div>

      {/* Active filter badges */}
      <AnimatePresence>
        {activeFilters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <Tag className="w-3 h-3 text-muted-foreground" />
            {activeFilters.map((f) => (
              <motion.span
                key={f.key}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold
                  bg-violet-500/15 text-violet-400 border border-violet-500/20"
              >
                {f.label}
                <button
                  onClick={() => {
                    if (f.key === "cat") setSelectedCategory("All");
                    if (f.key === "margin") setSelectedMargin(0);
                  }}
                  className="hover:text-white transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </motion.span>
            ))}
            <button
              onClick={() => {
                setSelectedCategory("All");
                setSelectedMargin(0);
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Clear all
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
