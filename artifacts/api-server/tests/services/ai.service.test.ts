import { test, expect, vi, beforeEach } from "vitest";
import { hasKey, tryProviders } from "../../src/services/ai";
import { resetDb, seedTable } from "@workspace/db/test-utils";

beforeEach(() => {
  vi.restoreAllMocks();
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

test("hasKey returns true when key is present", async () => {
  seedTable("ai_settings", [
    {
      userId: 1,
      provider: "groq",
      apiKey: "test-key",
      model: "llama-3.3-70b-versatile",
    },
  ]);

  const result = await hasKey("groq");
  expect(result).toBe(true);
});

test("hasKey returns false when no key present", async () => {
  const result = await hasKey("groq");
  expect(result).toBe(false);
});

test("tryProviders throws when no keys available", async () => {
  await expect(
    tryProviders("test", "system", [
      "groq",
      "deepseek",
      "mistral",
      "openrouter",
    ]),
  ).rejects.toThrow("No AI API keys configured");
});

test("tryProviders uses groq when groq key exists", async () => {
  seedTable("ai_settings", [
    {
      userId: 1,
      provider: "groq",
      apiKey: "test-key",
      model: "llama-3.3-70b-versatile",
    },
  ]);

  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "AI response" } }],
      }),
    }),
  );

  const res = await tryProviders("analyze this product", "You are an expert.", [
    "groq",
  ]);
  expect(res).toBe("AI response");
  expect(fetch).toHaveBeenCalledTimes(1);
});
