import { describe, it, expect } from "vitest";
import { detectCategory } from "../../src/services/fulfillment-utils";

describe("fulfillment-utils", () => {
  describe("detectCategory", () => {
    it("detects tech products", () => {
      expect(detectCategory("Wireless Earbuds Pro")).toBe("tech");
      expect(detectCategory("USB-C Cable")).toBe("tech");
      expect(detectCategory("Fitness Tracker Watch")).toBe("tech");
    });

    it("detects health products", () => {
      expect(detectCategory("Yoga Mat Premium")).toBe("health");
      expect(detectCategory("Vitamin D3 Supplement")).toBe("health");
    });

    it("detects home products", () => {
      expect(detectCategory("LED Desk Lamp")).toBe("home");
      expect(detectCategory("Scented Candle Set")).toBe("home");
    });

    it("detects kitchen products", () => {
      expect(detectCategory("Coffee Mug Set")).toBe("kitchen");
      expect(detectCategory("Blender 1000W")).toBe("kitchen");
    });

    it("detects beauty products", () => {
      expect(detectCategory("Hair Serum")).toBe("beauty");
      expect(detectCategory("Lip Balm")).toBe("beauty");
    });

    it("detects pet products", () => {
      expect(detectCategory("Dog Leash")).toBe("pet");
      expect(detectCategory("Cat Toy Mouse")).toBe("pet");
    });

    it("detects outdoor products", () => {
      expect(detectCategory("Camping Tent")).toBe("outdoor");
      expect(detectCategory("Fishing Rod")).toBe("outdoor");
    });

    it("falls back to general", () => {
      expect(detectCategory("Unique Artifact")).toBe("general");
      expect(detectCategory("Hiking Backpack")).toBe("general");
    });
  });
});
