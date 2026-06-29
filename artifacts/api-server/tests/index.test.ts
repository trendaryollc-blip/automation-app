import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Track which app modules we've loaded
const appModules: Record<string, any> = {};

function createFakeApp() {
  return {
    listen: vi.fn((...args: any[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === "function") cb();
      return { close: vi.fn() };
    }),
  };
}

describe("index.ts server startup", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("throws when PORT env var is missing", async () => {
    vi.stubEnv("PORT", "");
    await expect(async () => {
      // We can load the module directly and it should throw via the top-level check
      // Actually the module wraps app.listen in a try/catch implicitly
      // The PORT check happens at module load time
      const mod = await import("../src/index");
    }).rejects.toThrow(/PORT/);
  });

  it("throws when PORT is invalid", async () => {
    vi.stubEnv("PORT", "abc");
    vi.resetModules();
    await expect(import("../src/index")).rejects.toThrow(
      "Invalid PORT value",
    );
  });

  it("starts server on port without host", async () => {
    vi.stubEnv("PORT", "3000");
    vi.stubEnv("HOST", "");

    // Mock app module
    const fakeApp = createFakeApp();
    vi.doMock("../src/app", () => ({ default: fakeApp }));

    vi.resetModules();
    await import("../src/index");
    expect(fakeApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
  });

  it("starts server on port with host", async () => {
    vi.stubEnv("PORT", "4000");
    vi.stubEnv("HOST", "0.0.0.0");

    const fakeApp = createFakeApp();
    vi.doMock("../src/app", () => ({ default: fakeApp }));

    vi.resetModules();
    await import("../src/index");
    expect(fakeApp.listen).toHaveBeenCalledWith(
      4000,
      "0.0.0.0",
      expect.any(Function),
    );
  });
});