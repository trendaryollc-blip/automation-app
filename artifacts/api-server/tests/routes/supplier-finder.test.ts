import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { resetDb, seedTable, getTableData } from "@workspace/db";

describe("Supplier Finder routes", () => {
  beforeEach(() => {
    resetDb();
  });

  it("POST /suppliers/find returns 400 when productName missing", async () => {
    const api = request(app);
    const res = await api
      .post("/api/suppliers/find")
      .send({ targetCostPrice: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("productName is required");
  });

  it("POST /suppliers/find returns matches with existing suppliers", async () => {
    seedTable("suppliers", [
      {
        id: 1,
        name: "TechSupplier Co",
        country: "China",
        rating: "4.5",
        shippingDays: 7,
        website: "https://techsupplier.cn",
        contactEmail: "info@techsupplier.cn",
      },
      {
        id: 2,
        name: "Global Parts Inc",
        country: "United States",
        rating: "4.0",
        shippingDays: 3,
        website: "https://globalparts.us",
        contactEmail: "sales@globalparts.us",
      },
    ]);

    const api = request(app);
    const res = await api.post("/api/suppliers/find").send({
      productName: "Wireless Earbuds Bluetooth",
      targetCostPrice: 8,
      preferredCountry: "United States",
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("matches");
    expect(res.body.matches.length).toBeGreaterThanOrEqual(2);
    expect(res.body).toHaveProperty("topPick");
    expect(res.body).toHaveProperty("sourcingTips");
    expect(res.body.productName).toBe("Wireless Earbuds Bluetooth");

    // Verify sort order (descending matchScore)
    const scores = res.body.matches.map((m: any) => m.matchScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }

    // Check data stored in DB
    const stored = getTableData("supplier_finder");
    expect(stored.length).toBe(1);
  });

  it("POST /suppliers/find works without existing suppliers", async () => {
    const api = request(app);
    const res = await api.post("/api/suppliers/find").send({
      productName: "Yoga Mat Premium",
    });
    expect(res.status).toBe(200);
    expect(res.body.matches).toHaveLength(2); // 2 suggested suppliers from default pool
    expect(res.body.matches[0].isExisting).toBe(false);
  });

  it("GET /suppliers/find/history returns past searches", async () => {
    seedTable("supplier_finder", [
      {
        id: 1,
        productName: "Search 1",
        topPick: "Supplier A",
        matches: [],
        sourcingTips: [],
        createdAt: new Date(),
      },
    ]);

    const api = request(app);
    const res = await api.get("/api/suppliers/find/history");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].productName).toBe("Search 1");
  });

  it("DELETE /suppliers/find/history/:id returns 400 with invalid id", async () => {
    const api = request(app);
    const res = await api.delete("/api/suppliers/find/history/not-a-number");
    expect(res.status).toBe(400);
  });

  it("DELETE /suppliers/find/history/:id returns 404 for missing record", async () => {
    const api = request(app);
    const res = await api.delete("/api/suppliers/find/history/9999");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Record not found");
  });

  it("DELETE /suppliers/find/history/:id deletes a record", async () => {
    seedTable("supplier_finder", [
      {
        id: 100,
        productName: "To Delete",
        topPick: "X",
        matches: [],
        sourcingTips: [],
        createdAt: new Date(),
      },
    ]);

    const api = request(app);
    const res = await api.delete("/api/suppliers/find/history/100");
    expect(res.status).toBe(204);
    expect(getTableData("supplier_finder").length).toBe(0);
  });
});
