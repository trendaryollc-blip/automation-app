import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAnalyzeProduct, useListResearchHistory, useDeleteResearchReport, getListResearchHistoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, CheckCircle2, XCircle, Trash2, ArrowRight } from "lucide-react";
import type { ResearchReport } from "@workspace/api-client-react";

export default function Research() {
  const [query, setQuery] = useState("");
  const [activeReport, setActiveReport] = useState<ResearchReport | null>(null);
  
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: history, isLoading: historyLoading } = useListResearchHistory();
  const analyzeMutation = useAnalyzeProduct();
  const deleteMutation = useDeleteResearchReport();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    analyzeMutation.mutate({ data: { query } }, {
      onSuccess: (data) => {
        setActiveReport(data);
        queryClient.invalidateQueries({ queryKey: getListResearchHistoryQueryKey() });
      }
    });
  };

  const handleRowClick = (report: ResearchReport) => {
    setQuery(report.query);
    setActiveReport(report);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        if (activeReport?.id === id) {
          setActiveReport(null);
          setQuery("");
        }
        queryClient.invalidateQueries({ queryKey: getListResearchHistoryQueryKey() });
      }
    });
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'strong-buy': return 'bg-green-500 hover:bg-green-600 text-white';
      case 'buy': return 'bg-teal-500 hover:bg-teal-600 text-white';
      case 'hold': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'avoid': return 'bg-red-500 hover:bg-red-600 text-white';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500 hover:bg-green-600 text-white';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'high': return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'very-high': return 'bg-red-500 hover:bg-red-600 text-white';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const handleAddToProducts = () => {
    if (!activeReport) return;
    const searchParams = new URLSearchParams({
      name: activeReport.query,
      sellPrice: activeReport.suggestedPrice.toString(),
      description: activeReport.summary || ""
    });
    // In a real implementation we would prefill the create product flow.
    // For now we just redirect to products page, maybe we could use history state
    // but a query string is simplest. Wait, the products page uses a dialog for creation.
    // We'll just navigate to products with a querystring, assuming the user will click Add Product
    // Or we can just redirect to /products
    setLocation(`/products`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Product Research</h1>
        <p className="text-muted-foreground mt-1">Analyze product viability, competition, and margins.</p>
      </div>

      <div className="space-y-4">
        <form onSubmit={handleAnalyze} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter a product keyword or URL..."
              className="pl-9 h-10 text-lg"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={analyzeMutation.isPending}
            />
          </div>
          <Button type="submit" className="h-10 px-8" disabled={analyzeMutation.isPending || !query.trim()}>
            {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Analyze"}
          </Button>
        </form>

        {analyzeMutation.isPending && !activeReport && (
          <Card className="border border-border">
            <CardContent className="p-12 flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p>Analyzing market data and competition...</p>
            </CardContent>
          </Card>
        )}

        {activeReport && !analyzeMutation.isPending && (
          <Card className="border-border">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b border-border/50">
              <div className="space-y-1">
                <CardTitle className="text-2xl flex items-center gap-3">
                  {activeReport.query}
                  <Badge className={`text-sm ${getVerdictColor(activeReport.verdict)}`}>
                    {activeReport.verdict.toUpperCase().replace('-', ' ')}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">Generated on {new Date(activeReport.createdAt).toLocaleDateString()}</p>
              </div>
              <Button onClick={handleAddToProducts} className="gap-2">
                Add to Products <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground flex justify-between">
                    <span>Demand Score</span>
                    <span className="text-foreground font-bold">{activeReport.demandScore}/100</span>
                  </div>
                  <Progress value={activeReport.demandScore} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Competition Level</div>
                  <Badge className={`${getCompetitionColor(activeReport.competitionLevel)}`}>
                    {activeReport.competitionLevel.toUpperCase().replace('-', ' ')}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Suggested Price</div>
                  <div className="text-2xl font-bold text-primary">${activeReport.suggestedPrice.toFixed(2)}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground flex justify-between">
                    <span>Est. Margin</span>
                    <span className="text-green-500 font-bold">{activeReport.estimatedMargin}%</span>
                  </div>
                  <Progress value={activeReport.estimatedMargin} className="h-2 [&>div]:bg-green-500" />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Top Niches</h4>
                <div className="flex flex-wrap gap-2">
                  {activeReport.topNiches.map((niche, i) => (
                    <Badge key={i} variant="secondary" className="px-3 py-1">
                      {niche.name} <span className="ml-2 opacity-60">{niche.score}</span>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Pros</h4>
                  <ul className="space-y-2">
                    {activeReport.pros.map((pro, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Cons</h4>
                  <ul className="space-y-2">
                    {activeReport.cons.map((con, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {activeReport.summary && (
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm leading-relaxed">{activeReport.summary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-8 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold mb-4">Research History</h3>
        <div className="border rounded-md bg-card flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Query</TableHead>
                <TableHead>Verdict</TableHead>
                <TableHead className="text-right">Demand</TableHead>
                <TableHead>Competition</TableHead>
                <TableHead className="text-right">Sugg. Price</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : history?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No research history. Run your first analysis above.
                  </TableCell>
                </TableRow>
              ) : (
                history?.map((report) => (
                  <TableRow 
                    key={report.id} 
                    className={`cursor-pointer ${activeReport?.id === report.id ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
                    onClick={() => handleRowClick(report)}
                  >
                    <TableCell className="font-medium">{report.query}</TableCell>
                    <TableCell>
                      <Badge className={getVerdictColor(report.verdict)}>
                        {report.verdict.toUpperCase().replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{report.demandScore}</TableCell>
                    <TableCell>
                      <Badge className={getCompetitionColor(report.competitionLevel)}>
                        {report.competitionLevel.toUpperCase().replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">${report.suggestedPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(e, report.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
