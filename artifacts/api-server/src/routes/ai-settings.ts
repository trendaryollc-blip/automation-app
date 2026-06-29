import { Router, type IRouter } from "express";
import { db, aiSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function isFirestoreMode(): boolean {
  return (process.env.DB_MODE || "").toLowerCase() === "firestore";
}

function aiSettingsRepo() {
  return {
    findMany: async () => [] as any[],
    findById: async (_id: string) => null as any,
    findOne: async (_filters: any) => null as any,
    createWithId: async (_id: string, _data: any) => ({}),
    remove: async (_id: string) => true,
  };
}

const PROVIDERS = [
  {
    id: "groq",
    label: "Groq",
    defaultModel: "llama-3.3-70b-versatile",
    freeUrl: "https://console.groq.com/keys",
    task: "Product scoring & descriptions",
  },
  {
    id: "mistral",
    label: "Mistral AI",
    defaultModel: "mistral-small-latest",
    freeUrl: "https://console.mistral.ai/api-keys/",
    task: "Market analysis & research",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    defaultModel: "deepseek-chat",
    freeUrl: "https://platform.deepseek.com/api_keys",
    task: "Product research & supplier finding",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "mistralai/mistral-7b-instruct:free",
    freeUrl: "https://openrouter.ai/keys",
    task: "General fallback (free models)",
  },
  {
    id: "cohere",
    label: "Cohere",
    defaultModel: "command-r",
    freeUrl: "https://dashboard.cohere.com/api-keys",
    task: "Semantic search & embeddings",
  },
  {
    id: "serpapi",
    label: "SerpAPI",
    defaultModel: null,
    freeUrl: "https://serpapi.com/manage-api-key",
    task: "Web search for supplier research",
  },
];

router.get("/ai-settings/providers", (_req, res) => {
  res.json(PROVIDERS);
});

router.get("/ai-settings", async (_req, res) => {
  if (isFirestoreMode()) {
    const rows = await aiSettingsRepo().findMany();
    const result = rows.map((r: any) => ({
      provider: r.provider,
      model: r.model,
      hasKey: true,
      maskedKey: r.apiKey.slice(0, 6) + "••••••••" + r.apiKey.slice(-4),
      updatedAt: r.updatedAt,
    }));
    res.json(result);
    return;
  }
  const rows = await db.select().from(aiSettingsTable);
  const result = rows.map((r) => {
    const safeApiKey =
      typeof r.apiKey === "string" ? r.apiKey : String(r.apiKey ?? "");
    return {
      provider: r.provider,
      model: r.model,
      hasKey: true,
      maskedKey: safeApiKey.slice(0, 6) + "••••••••" + safeApiKey.slice(-4),
      updatedAt: r.updatedAt.toISOString(),
    };
  });
  res.json(result);
});

router.put("/ai-settings/:provider", async (req, res) => {
  const { provider } = req.params;
  const { apiKey, model } = req.body as { apiKey?: string; model?: string };

  if (!PROVIDERS.find((p) => p.id === provider)) {
    res.status(400).json({ error: "Unknown provider" });
    return;
  }
  if (!apiKey || !apiKey.trim()) {
    res.status(400).json({ error: "apiKey is required" });
    return;
  }

  if (isFirestoreMode()) {
    const repo = aiSettingsRepo();
    await repo.createWithId(provider, {
      provider,
      apiKey: apiKey.trim(),
      model: model?.trim() || null,
    });
    const row = await repo.findById(provider);
    if (!row) {
      res.status(500).json({ error: "Failed to save settings" });
      return;
    }
    const safeApiKey =
      typeof row.apiKey === "string" ? row.apiKey : String(row.apiKey ?? "");
    res.json({
      provider: row.provider,
      model: row.model,
      hasKey: true,
      maskedKey: safeApiKey.slice(0, 6) + "••••••••" + safeApiKey.slice(-4),
      updatedAt: row.updatedAt,
    });
    return;
  }

  const [row] = await db
    .insert(aiSettingsTable)
    .values({ provider, apiKey: apiKey.trim(), model: model?.trim() || null })
    .onConflictDoUpdate({
      target: aiSettingsTable.provider,
      set: {
        apiKey: apiKey.trim(),
        model: model?.trim() || null,
        updatedAt: new Date(),
      },
    })
    .returning();

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

router.delete("/ai-settings/:provider", async (req, res) => {
  const { provider } = req.params;
  if (isFirestoreMode()) {
    await aiSettingsRepo().remove(provider);
    res.sendStatus(204);
    return;
  }
  await db
    .delete(aiSettingsTable)
    .where(eq(aiSettingsTable.provider, provider));
  res.sendStatus(204);
});

router.post("/ai-settings/test/:provider", async (req, res) => {
  const { provider } = req.params;
  const row = isFirestoreMode()
    ? await aiSettingsRepo().findOne({
        filters: [{ field: "provider", operator: "==", value: provider }],
      })
    : (
        await db
          .select()
          .from(aiSettingsTable)
          .where(eq(aiSettingsTable.provider, provider))
      )[0];

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

    let body: object;
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

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
