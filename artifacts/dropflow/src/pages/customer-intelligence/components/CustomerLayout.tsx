import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CustomerHeader from "./CustomerHeader";
import CustomerStats from "./CustomerStats";
import CustomerFilters from "./CustomerFilters";
import CustomerCharts from "./CustomerCharts";
import CustomerTable from "./CustomerTable";
import CustomerInsights from "./CustomerInsights";
import CustomerFeedback from "./CustomerFeedback";

export default function CustomerLayout() {
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedSpend, setSelectedSpend] = useState(0);
  const [selectedEngagement, setSelectedEngagement] = useState("All");
  const [sortBy, setSortBy] = useState("ltv");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Apply theme to <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ─── Hero Header ─── */}
      <CustomerHeader theme={theme} toggleTheme={toggleTheme} />

      {/* ─── KPI Stats Cards ─── */}
      <CustomerStats />

      {/* ─── Search & Filters ─── */}
      <CustomerFilters
        search={search}
        setSearch={setSearch}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        selectedSpend={selectedSpend}
        setSelectedSpend={setSelectedSpend}
        selectedEngagement={selectedEngagement}
        setSelectedEngagement={setSelectedEngagement}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* ─── Charts & Insights Sidebar ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 space-y-4">
          <CustomerCharts />
          <CustomerTable
            search={search}
            selectedRegion={selectedRegion}
            selectedSpend={selectedSpend}
            selectedEngagement={selectedEngagement}
            sortBy={sortBy}
          />
        </div>

        <div className="xl:col-span-1">
          <CustomerInsights />
        </div>
      </div>

      {/* ─── Customer Feedback (Loyalty & Satisfaction) ─── */}
      <CustomerFeedback />
    </motion.div>
  );
}
