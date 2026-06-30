import request from "supertest";
import app from "./src/app";
import { resetDb, seedTable } from "./tests/__mocks__/@workspace_db";

async function run() {
  resetDb();

  console.log("=== bulk update reproduction ===");
  seedTable("orders", [
    {
      id: 100,
      orderNumber: "BULK1",
      status: "pending",
      productId: 10,
      quantity: 1,
    },
  ]);
  seedTable("products", [{ id: 10, name: "Bulk Product", stockQuantity: 5 }]);
  const bulkUpdate = await request(app)
    .post("/api/orders/bulk-update")
    .send({ orderIds: [100], status: "delivered" });
  console.log("bulkUpdate status", bulkUpdate.status);
  console.log("bulkUpdate body", bulkUpdate.body);

  console.log("=== price watch snapshot reproduction ===");
  const createWatch = await request(app)
    .post("/api/price-watch")
    .send({ name: "Watch", url: "https://example.com" });
  console.log("createWatch", createWatch.status, createWatch.body);
  const watchId = createWatch.body.id;
  const createSnapshot = await request(app)
    .post(`/api/price-watch/${watchId}/snapshots`)
    .send({ price: 99 });
  console.log("snapshot status", createSnapshot.status);
  console.log("snapshot body", createSnapshot.body);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
