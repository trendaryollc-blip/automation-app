import { useState } from "react";
import { Link } from "wouter";
import {
  useFindSuppliers,
  useListSupplierFinderHistory,
  useDeleteSupplierFinderResult,
  getListSupplierFinderHistoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Check, ExternalLink, Mail, Trash2, ShieldCheck, MapPin, Star, Clock } from "lucide-react";
import type { SupplierFinderResult } from "@workspace/api-client-react";

export default function SupplierFinder() {
  const [productName, setProductName] = useState("");
  const [targetCostPrice, setTargetCostPrice] = useState("");
  const [preferredCountry, setPreferredCountry] = useState("");
  const [activeResult, setActiveResult] = useState<SupplierFinderResult | null>(null);

  const queryClient = useQueryClient();
  const { data: history, isLoading: historyLoading } = useListSupplierFinderHistory();
  const findSuppliersMutation = useFindSuppliers();
  const deleteMutation = useDeleteSupplierFinderResult();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;

    findSuppliersMutation.mutate(
      {
        data: {
          productName,
          targetCostPrice: targetCostPrice ? parseFloat(targetCostPrice) : undefined,
          preferredCountry: preferredCountry || undefined,
        },
      },
      {
        onSuccess: (data) => {
          setActiveResult(data);
          queryClient.invalidateQueries({ queryKey: getListSupplierFinderHistoryQueryKey() });
        },
      }
    );
  };

  const handleRowClick = (result: SupplierFinderResult) => {
    setProductName(result.productName);
    setTargetCostPrice(result.targetCostPrice?.toString() || "");
    setPreferredCountry(result.preferredCountry || "");
    setActiveResult(result);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          if (activeResult?.id === id) {
            setActiveResult(null);
            setProductName("");
            setTargetCostPrice("");
            setPreferredCountry("");
          }
          queryClient.invalidateQueries({ queryKey: getListSupplierFinderHistoryQueryKey() });
        },
      }
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Supplier Finder</h1>
        <p className="text-muted-foreground mt-1">Discover and vet dropshipping suppliers for any product.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="text-lg">Supplier Search</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productName">Product Name</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="productName"
                      placeholder="e.g. Wireless Charging Pad"
                      className="pl-9"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      disabled={findSuppliersMutation.isPending}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetCostPrice">Target Cost Price (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                    <Input
                      id="targetCostPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 8.00"
                      className="pl-7"
                      value={targetCostPrice}
                      onChange={(e) => setTargetCostPrice(e.target.value)}
                      disabled={findSuppliersMutation.isPending}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredCountry">Preferred Country</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="preferredCountry"
                      placeholder="e.g. China"
                      className="pl-9"
                      value={preferredCountry}
                      onChange={(e) => setPreferredCountry(e.target.value)}
                      disabled={findSuppliersMutation.isPending}
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={findSuppliersMutation.isPending || !productName.trim()}>
                {findSuppliersMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning supplier network...
                  </>
                ) : (
                  "Find Suppliers"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {findSuppliersMutation.isPending && !activeResult && (
          <Card className="border border-border">
            <CardContent className="p-12 flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p>Scanning global supplier databases...</p>
            </CardContent>
          </Card>
        )}

        {activeResult && !findSuppliersMutation.isPending && (
          <div className="space-y-6 animate-in fade-in">
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 overflow-hidden">
              <div className="bg-green-500/10 px-4 py-2 border-b border-green-500/20 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <span className="font-semibold text-green-500">Top Pick: {activeResult.topPick}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {activeResult.matches.map((match, idx) => (
                <Card key={idx} className="border-border">
                  <CardContent className="p-5 flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono">{idx + 1}st</Badge>
                            <h3 className="text-lg font-bold">{match.name}</h3>
                            <Badge variant="outline" className="text-muted-foreground">{match.country}</Badge>
                            {match.isExisting ? (
                              <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">In Directory</Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20">New Supplier</Badge>
                            )}
                          </div>
                          <p className="text-sm italic text-muted-foreground">{match.matchReason}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="text-2xl font-bold text-primary">${match.estimatedCostPrice.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">Est. Cost</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{match.shippingDays} days shipping</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span>{match.rating.toFixed(1)} rating</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="font-mono text-xs">{match.matchScore} / 100</Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {match.pros.map((pro, i) => (
                          <Badge key={i} variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20">
                            <Check className="w-3 h-3 mr-1" />
                            {pro}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="w-full md:w-48 flex flex-col justify-end space-y-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                      {match.isExisting ? (
                        <Link href={`/suppliers/${match.supplierId}`}>
                          <Button variant="secondary" className="w-full">View Supplier</Button>
                        </Link>
                      ) : (
                        <>
                          {match.website && (
                            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => copyToClipboard(match.website!)}>
                              <ExternalLink className="w-4 h-4" />
                              Website
                            </Button>
                          )}
                          {match.contactEmail && (
                            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => copyToClipboard(match.contactEmail!)}>
                              <Mail className="w-4 h-4" />
                              Email
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Sourcing Tips for {activeResult.productName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 list-decimal list-inside text-sm text-muted-foreground ml-2">
                  {activeResult.sourcingTips.map((tip, i) => (
                    <li key={i} className="pl-1">{tip}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col mt-4">
        <h3 className="text-lg font-semibold mb-4">Search History</h3>
        <div className="border border-border rounded-md bg-card flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Top Pick</TableHead>
                <TableHead className="text-right">Matches</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : history?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No searches yet. Run your first supplier search above.
                  </TableCell>
                </TableRow>
              ) : (
                history?.map((result) => (
                  <TableRow
                    key={result.id}
                    className={`cursor-pointer ${activeResult?.id === result.id ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
                    onClick={() => handleRowClick(result)}
                  >
                    <TableCell className="font-medium">{result.productName}</TableCell>
                    <TableCell>{result.topPick}</TableCell>
                    <TableCell className="text-right font-mono">{result.matches.length}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(result.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(e, result.id)}
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
