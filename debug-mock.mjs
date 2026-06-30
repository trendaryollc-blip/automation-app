import * as dbMock from "./Drop-Ship-Automatezip/artifacts/api-server/tests/__mocks__/@workspace_db.ts";
const {
  db,
  ordersTable,
  productsTable,
  priceWatchTable,
  priceSnapshotsTable,
  eq,
  inArray,
  sql,
  seedTable,
} = dbMock;
console.log("seed order...");
seedTable("orders", [
  { id: 100, status: "pending", productId: 10, quantity: 1 },
]);
seedTable("products", [{ id: 10, name: "Bulk Product", stockQuantity: 5 }]);
const res = db
  .update(ordersTable)
  .set({ status: "delivered" })
  .where(inArray(ordersTable.id, [100]));
console.log("update orders thenable type:", typeof res.then);
res
  .then((v) => {
    console.log("resolved update orders", v);
    const res2 = db
      .update(productsTable)
      .set({
        stockQuantity: sql`GREATEST(0, COALESCE(stock_quantity, 0) - ${1})`,
      })
      .where(eq(productsTable.id, 10));
    console.log("update products thenable type:", typeof res2.then);
    return res2;
  })
  .then((v) => {
    console.log("resolved update products", v);
    const snap = db
      .insert(priceSnapshotsTable)
      .values({ watchId: 1, price: "99", note: null });
    console.log("snapshot returned object keys", Object.keys(snap));
    console.log("snapshot returning", snap.returning());
  })
  .catch((err) => {
    console.error("Error", err);
  });
