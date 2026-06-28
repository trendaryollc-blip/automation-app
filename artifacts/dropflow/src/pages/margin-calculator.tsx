import { useState, useMemo } from "react";
import { Calculator, TrendingUp, DollarSign, Package, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(n: number) {
  return n.toFixed(1) + "%";
}

interface BreakEvenRow {
  adSpend: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
}

export default function MarginCalculator() {
  const [costPrice, setCostPrice] = useState<string>("25.00");
  const [targetMargin, setTargetMargin] = useState<number>(40);
  const [shippingCost, setShippingCost] = useState<string>("4.50");
  const [platformFee, setPlatformFee] = useState<string>("3.00");

  const cost = parseFloat(costPrice) || 0;
  const shipping = parseFloat(shippingCost) || 0;
  const platform = parseFloat(platformFee) || 0;
  const totalCost = cost + shipping + platform;

  const results = useMemo(() => {
    if (totalCost <= 0 || targetMargin >= 100) return null;
    const sellPrice = totalCost / (1 - targetMargin / 100);
    const profitPerUnit = sellPrice - totalCost;
    const actualMargin = totalCost > 0 ? ((sellPrice - totalCost) / sellPrice) * 100 : 0;
    const markup = totalCost > 0 ? ((sellPrice - totalCost) / totalCost) * 100 : 0;

    const adSpendLevels = [0, 3, 5, 8, 12, 20];
    const breakEvenRows: BreakEvenRow[] = adSpendLevels.map((adSpend) => {
      const netProfit = profitPerUnit - adSpend;
      if (netProfit <= 0) {
        return { adSpend, breakEvenUnits: Infinity, breakEvenRevenue: Infinity };
      }
      const fixedCosts = 0;
      const breakEvenUnits = fixedCosts > 0 ? Math.ceil(fixedCosts / netProfit) : 0;
      return { adSpend, breakEvenUnits, breakEvenRevenue: breakEvenUnits * sellPrice };
    });

    const scenarios = [10, 50, 100, 500, 1000].map((units) => ({
      units,
      revenue: units * sellPrice,
      profit: units * profitPerUnit,
    }));

    return { sellPrice, profitPerUnit, actualMargin, markup, breakEvenRows, scenarios };
  }, [totalCost, targetMargin]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="w-6 h-6 text-primary" />
          Margin Calculator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Enter your costs and target margin to find the ideal sell price and profit projections.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cost Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="cost">Product Cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="cost"
                  className="pl-7"
                  type="number"
                  min="0"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipping">Shipping Cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="shipping"
                  className="pl-7"
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform / Transaction Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="platform"
                  className="pl-7"
                  type="number"
                  min="0"
                  step="0.01"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Cost Per Unit</span>
                <span className="font-semibold">{fmt(totalCost)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Target Margin</Label>
                <span className="text-primary font-bold text-lg">{targetMargin}%</span>
              </div>
              <Slider
                min={1}
                max={90}
                step={1}
                value={[targetMargin]}
                onValueChange={([v]) => setTargetMargin(v)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1%</span>
                <span>45%</span>
                <span>90%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {results ? (
            <>
              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      Sell Price
                    </div>
                    <div className="text-xl font-bold text-primary">{fmt(results.sellPrice)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Profit / Unit
                    </div>
                    <div className="text-xl font-bold text-green-400">{fmt(results.profitPerUnit)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                      <BarChart2 className="w-3.5 h-3.5" />
                      Actual Margin
                    </div>
                    <div className="text-xl font-bold">{pct(results.actualMargin)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                      <Package className="w-3.5 h-3.5" />
                      Markup
                    </div>
                    <div className="text-xl font-bold">{pct(results.markup)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Ad spend break-even */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Ad Spend Break-Even</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    How many units you need to sell at each ad spend level to cover your costs and turn a profit.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                          <th className="text-left pb-2 pr-4">Ad Spend / Unit</th>
                          <th className="text-right pb-2 pr-4">Net Profit / Unit</th>
                          <th className="text-right pb-2 pr-4">ROAS Needed</th>
                          <th className="text-right pb-2">Margin After Ads</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {results.breakEvenRows.map((row) => {
                          const net = results.profitPerUnit - row.adSpend;
                          const roas = row.adSpend > 0 ? results.sellPrice / row.adSpend : null;
                          const marginAfterAds = (net / results.sellPrice) * 100;
                          const isNegative = net <= 0;
                          return (
                            <tr key={row.adSpend} className={isNegative ? "opacity-40" : ""}>
                              <td className="py-2 pr-4 font-medium">{fmt(row.adSpend)}</td>
                              <td className={`py-2 pr-4 text-right font-semibold ${isNegative ? "text-red-400" : "text-green-400"}`}>
                                {fmt(net)}
                              </td>
                              <td className="py-2 pr-4 text-right text-muted-foreground">
                                {roas != null ? `${roas.toFixed(2)}x` : "—"}
                              </td>
                              <td className={`py-2 text-right font-semibold ${isNegative ? "text-red-400" : ""}`}>
                                {isNegative ? "Unprofitable" : pct(marginAfterAds)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Volume scenarios */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Volume Projections</CardTitle>
                  <p className="text-xs text-muted-foreground">Estimated revenue and profit at different order volumes (excluding ad spend).</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                          <th className="text-left pb-2 pr-4">Units Sold</th>
                          <th className="text-right pb-2 pr-4">Gross Revenue</th>
                          <th className="text-right pb-2">Gross Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {results.scenarios.map((s) => (
                          <tr key={s.units}>
                            <td className="py-2 pr-4 font-medium">{s.units.toLocaleString()}</td>
                            <td className="py-2 pr-4 text-right">{fmt(s.revenue)}</td>
                            <td className="py-2 text-right font-semibold text-green-400">{fmt(s.profit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="flex items-center justify-center h-64">
              <p className="text-muted-foreground text-sm">Enter a valid cost and margin to see results.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
