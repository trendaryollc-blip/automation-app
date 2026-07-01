import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and } from "drizzle-orm";
import { db, aiSettingsTable } from "@workspace/db";
import { currentUser } from "../middlewares/auth.js";

const router: IRouter = Router();

const ProviderParamSchema = z.object({
  provider: z.enum([
    "groq",
    "openrouter",
    "mistral",
    "deepseek",
    "cohere",
    "serpapi",
  ]),
});

const SaveKeyBodySchema = z.object({
  apiKey: z.string().min(1).max(4000),
  model: z.string().max(200).nullish(),
});

const PROVIDERS = [
  { id: "groq", label: "Groq", defaultModel: "llama-3.3-70b-versatile" },
  { id: "mistral", label: "Mistral AI", defaultModel: "mistral-small-latest" },
  { id: "deepseek", label: "DeepSeek", defaultModel: "deepseek-chat" },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "mistralai/mistral-7b-instruct:free",
  },
  { id: "cohere", label: "Cohere", defaultModel: "command-r" },
  { id: "serpapi", label: "SerpAPI", defaultModel: null },
] as const;

router.get("/ai-settings/providers", (_req, res): void => {
  res.json(PROVIDERS);
});

router.get("/ai-settings", async (req, res): Promise<void> => {
  const user = currentUser(req);
  const rows = await db
    .select()
    .from(aiSettingsTable)
    .where(eq(aiSettingsTable.userId, user.id));
  res.json(
    rows.map((r) => {
      const safeApiKey =
        typeof r.apiKey === "string" ? r.apiKey : String(r.apiKey ?? "");
      return {
        provider: r.provider,
        model: r.model,
        hasKey: true,
        maskedKey: safeApiKey.slice(0, 6) + "••••••••" + safeApiKey.slice(-4),
        updatedAt: r.updatedAt.toISOString(),
      };
    }),
  );
});

router.put("/ai-settings/:provider", async (req, res): Promise<void> => {
  const params = ProviderParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SaveKeyBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = currentUser(req);
  const { provider } = params.data;
  const apiKey = parsed.data.apiKey.trim();
  const model = parsed.data.model?.trim() || null;

  // Per-user upsert: select existing (userId, provider) row, update or insert.
  const [existing] = await db
    .select()
    .from(aiSettingsTable)
    .where(
      and(
        eq(aiSettingsTable.userId, user.id),
        eq(aiSettingsTable.provider, provider),
      ),
    )
    .limit(1);

  const row = existing
    ? (
        await db
          .update(aiSettingsTable)
          .set({ apiKey, model, updatedAt: new Date() })
          .where(
            and(
              eq(aiSettingsTable.userId, user.id),
              eq(aiSettingsTable.provider, provider),
            ),
          )
          .returning()
      )[0]
    : (
        await db
          .insert(aiSettingsTable)
          .values({ userId: user.id, provider, apiKey, model })
          .returning()
      )[0];

  const safeApiKey =
    typeof row.apiKey === "string" ? row.apiKey : String(row.apiKey ?? "");
  res.json({
    provider: row.provider,
    model: row.model,
    hasKey: true,
    maskedKey: safeApiKey.slice(0, 6) + "••••••••" + safeApiKey.slice(-4),
    updatedAt: row.updatedAt.toISOString(),
  });
});

router.delete("/ai-settings/:provider", async (req, res): Promise<void> => {
  const params = ProviderParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  await db
    .delete(aiSettingsTable)
    .where(
      and(
        eq(aiSettingsTable.userId, user.id),
        eq(aiSettingsTable.provider, params.data.provider),
      ),
    );
  res.sendStatus(204);
});

router.post("/ai-settings/test/:provider", async (req, res): Promise<void> => {
  const params = ProviderParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = currentUser(req);
  const { provider } = params.data;
  const [row] = await db
    .select()
    .from(aiSettingsTable)
    .where(
      and(
        eq(aiSettingsTable.userId, user.id),
        eq(aiSettingsTable.provider, provider),
      ),
    )
    .limit(1);

  if (!row) {
    res
      .status(404)
      .json({ ok: false, error: "No key saved for this provider" });
    return;
  }

  const apiKey =
    typeof row.apiKey === "string" ? row.apiKey : String(row.apiKey ?? "");

  try {
    if (provider === "serpapi") {
      const params = new URLSearchParams({
        q: "test",
        api_key: apiKey,
        num: "1",
        engine: "google",
      });
      const r = await fetch(`https://serpapi.com/search.json?${params}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      res.json({ ok: true, message: "SerpAPI key is valid" });
      return;
    }

    const endpoints: Record<string, string> = {
      groq: "https://api.groq.com/openai/v1/chat/completions",
      mistral: "https://api.mistral.ai/v1/chat/completions",
      deepseek: "https://api.deepseek.com/v1/chat/completions",
      openrouter: "https://openrouter.ai/api/v1/chat/completions",
      cohere: "https://api.cohere.com/v2/chat",
    };

    const url = endpoints[provider];
    if (!url) {
      res.json({
        ok: true,
        message: "Key saved (test not available for this provider)",
      });
      return;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    let body: object;
    if (provider === "cohere") {
      body = {
        model: row.model ?? "command-r",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      };
    } else if (provider === "openrouter") {
      headers["HTTP-Referer"] = "https://dropflow.app";
      headers["X-Title"] = "DropFlow";
      body = {
        model: row.model ?? "mistralai/mistral-7b-instruct:free",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      };
    } else {
      body = {
        model: row.model ?? "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      };
    }

    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`HTTP ${r.status}: ${errText.slice(0, 200)}`);
    }
    res.json({ ok: true, message: "Key is valid and working" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.json({ ok: false, error: msg });
  }
});

export default router;
