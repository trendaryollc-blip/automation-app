import { useState } from "react";
import { motion } from "framer-motion";
import ProductHeader from "./components/ProductHeader";
import ProductStats from "./components/ProductStats";
import ProductFilters from "./components/ProductFilters";
import ProductCharts from "./components/ProductCharts";
import ProductTable from "./components/ProductTable";
import ProductSidebar from "./components/ProductSidebar";

export default function ProductHuntingPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMargin, setSelectedMargin] = useState(0);
  const [sortBy, setSortBy] = useState("trending");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ─── Hero Header ─── */}
      <ProductHeader />

      {/* ─── KPI Stats Cards ─── */}
      <ProductStats />

      {/* ─── Search & Filters ─── */}
      <ProductFilters
        search={search}
        setSearch={setSearch}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedMargin={selectedMargin}
        setSelectedMargin={setSelectedMargin}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* ─── Main Content: Charts + Sidebar ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 space-y-4">
          {/* ─── Analytics Charts ─── */}
          <ProductCharts />

          {/* ─── Product Table ─── */}
          <ProductTable />
        </div>

        {/* ─── Right Sidebar ─── */}
        <div className="xl:col-span-1">
          <ProductSidebar />
        </div>
      </div>
    </motion.div>
  );
}