import { useParams } from "wouter";
import {
  useGetSupplier,
  getGetSupplierQueryKey,
  useGetSupplierProducts,
  getGetSupplierProductsQueryKey,
} from "@workspace/api-client-react";

export default function SupplierDetail() {
  const { id } = useParams();
  const supplierId = parseInt(id || "0");
  const { data: supplier, isLoading } = useGetSupplier(supplierId, {
    query: {
      enabled: !!supplierId,
      queryKey: getGetSupplierQueryKey(supplierId),
    },
  });
  const { data: products } = useGetSupplierProducts(supplierId, {
    query: {
      enabled: !!supplierId,
      queryKey: getGetSupplierProductsQueryKey(supplierId),
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!supplier) return <div>Not found</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
      <div className="p-6 bg-card border border-border rounded-lg space-y-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Country</h3>
          <p className="mt-1">{supplier.country}</p>
        </div>
      </div>
    </div>
  );
}
