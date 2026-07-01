import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { authedRequest } from "../helpers";
import express from "express";
import returnsRouter from "../../src/routes/returns";
import { resetDb, seedTable, getTableData } from "@workspace/db/test-utils";

// Use the in-memory mock DB so auth can find a seeded user.
vi.mock("@workspace/db", () => {
  const mod = require("../__mocks__/@workspace_db.ts");
  return { ...mod, default: mod };
});

const app = express().use(express.json()).use(returnsRouter);

describe("Returns routes", () => {
  beforeEach(() => resetDb());

  it("GET /returns returns empty array initially", async () => {
    const res = await authedRequest(app).get("/returns");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /returns creates a return with auto-generated returnNumber", async () => {
    const res = await authedRequest(app).post("/returns").send({
      orderId: 1,
      reason: "Damaged item",
      status: "pending",
    });
    expect(res.status).toBe(201);
    expect(res.body.returnNumber).toMatch(/^RET-\d{4}$/);
    expect(res.body.reason).toBe("Damaged item");

    const all = getTableData("returns");
    expect(all.length).toBe(1);
  });

  it("PATCH /returns/:id updates a return", async () => {
    const [ret] = seedTable("returns", [
      {
        userId: 1,
        id: 10,
        returnNumber: "RET-0001",
        status: "pending",
        reason: "Defect",
      },
    ]);

    const res = await authedRequest(app).patch(`/returns/${ret.id}`).send({
      status: "approved",
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
  });

  it("PATCH /returns/:id returns 404 for nonexistent", async () => {
    const res = await authedRequest(app)
      .patch("/returns/9999")
      .send({ status: "approved" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });

  it("DELETE /returns/:id removes a return", async () => {
    seedTable("returns", [{ userId: 1, id: 20, returnNumber: "RET-0002" }]);

    const res = await authedRequest(app).delete("/returns/20");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(getTableData("returns").length).toBe(0);
  });
});
