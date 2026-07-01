import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import app from "../../src/app";
import { resetDb, seedTable, getTableData } from "@workspace/db/test-utils";

// Use the in-memory mock DB so auth can find a seeded user.
vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

describe("Product Tags routes", () => {
  beforeEach(() => {
    resetDb();
    // Test-only auth setup: seed a default user so requireAuth() accepts
    // requests.  This pattern is shared by every test in this folder;
    // the row matches the FakeUser in tests/helpers.ts and lib/db/src/test-utils.ts.
    seedTable("users", [
      {
        userId: 1,
        id: 1,
        email: "test@example.com",
        passwordHash: "x",
        name: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  it("GET /product-tags returns empty array initially", async () => {
    const api = authedRequest(app);
    const res = await api.get("/api/product-tags");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /product-tags creates a tag", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/product-tags").send({ name: "clearance" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("clearance");
  });

  it("DELETE /product-tags/:id removes a tag and its links", async () => {
    seedTable("product_tags", [{ userId: 1, id: 50, name: "clearance" }]);
    seedTable("product_tag_links", [
      { userId: 1, id: 1, productId: 10, tagId: 50 },
      { id: 2, productId: 20, tagId: 50 },
    ]);

    const api = authedRequest(app);
    const res = await api.delete("/api/product-tags/50");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(getTableData("product_tags").length).toBe(0);
    expect(getTableData("product_tag_links").length).toBe(0);
  });

  it("GET /products/:id/tags returns empty for product with no tags", async () => {
    const api = authedRequest(app);
    const res = await api.get("/api/products/1/tags");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("GET /products/:id/tags returns tags for a product", async () => {
    seedTable("product_tags", [
      { userId: 1, id: 1, name: "sale" },
      { id: 2, name: "new" },
    ]);
    seedTable("product_tag_links", [
      { userId: 1, id: 10, productId: 100, tagId: 1 },
      { id: 11, productId: 100, tagId: 2 },
    ]);

    const api = authedRequest(app);
    const res = await api.get("/api/products/100/tags");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((t: any) => t.name).sort()).toEqual(["new", "sale"]);
  });

  it("POST /products/:id/tags links a tag to a product", async () => {
    const api = authedRequest(app);
    const res = await api.post("/api/products/5/tags").send({ tagId: 3 });
    expect(res.status).toBe(201);
    expect(res.body.productId).toBe(5);
    expect(res.body.tagId).toBe(3);

    const links = getTableData("product_tag_links");
    expect(links).toHaveLength(1);
    expect(links[0].productId).toBe(5);
    expect(links[0].tagId).toBe(3);
  });

  it("DELETE /products/:id/tags/:tagId removes link", async () => {
    seedTable("product_tag_links", [
      { userId: 1, id: 1, productId: 10, tagId: 20 },
    ]);

    const api = authedRequest(app);
    const res = await api.delete("/api/products/10/tags/20");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(getTableData("product_tag_links").length).toBe(0);
  });
});
