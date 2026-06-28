import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTable } from "@workspace/db";
// We'll import the real module at runtime using vi.importActual to avoid the test setup mock

describe("AI service unit tests", () => {
  beforeEach(() => {
    resetDb();
    vi.restoreAllMocks();
  });

  it("hasKey returns false when no key present and getKey returns null", async () => {
    const real = await vi.importActual("../src/services/ai.ts");
    const hk = await real.hasKey("groq" as any);
    expect(hk).toBe(false);
    const k = await real.getKey("groq" as any);
    expect(k).toBeNull();
  });

  it("tryProviders throws when no keys available", async () => {
    const real = await vi.importActual("../src/services/ai.ts");
    await expect(real.tryProviders("hi", "sys", [])).rejects.toThrow(
      "NO_AI_KEYS",
    );
  });

  it("tryProviders uses groq when groq key exists and returns chat content", async () => {
    // seed ai_settings with groq key
    seedTable("ai_settings", [
      { id: 1, provider: "groq", apiKey: "GROQKEY", model: "m1" },
    ]);

    // stub fetch to emulate groq response
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"ok":true}' } }],
        }),
      }),
    );

    const real = await vi.importActual("../src/services/ai.ts");
    const res = await real.tryProviders("prompt", "system", ["groq"] as any);
    expect(res).toBe('{"ok":true}');
  });
});
