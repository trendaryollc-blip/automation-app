import { db, aiSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type Provider =
  | "groq"
  | "openrouter"
  | "mistral"
  | "deepseek"
  | "cohere"
  | "serpapi";

async function getKey(provider: Provider): Promise<string | null> {
  const [row] = await db
    .select()
    .from(aiSettingsTable)
    .where(eq(aiSettingsTable.provider, provider));
  return row?.apiKey ?? null;
}

async function getModel(provider: Provider, fallback: string): Promise<string> {
  const [row] = await db
    .select()
    .from(aiSettingsTable)
    .where(eq(aiSettingsTable.provider, provider));
  return row?.model ?? fallback;
}

export async function hasKey(provider: Provider): Promise<boolean> {
  const key = await getKey(provider);
  return !!key;
}

async function chatGroq(prompt: string, systemPrompt: string): Promise<string> {
  const key = await getKey("groq");
  if (!key) throw new Error("Groq API key not configured");
  const model = await getModel("groq", "llama-3.3-70b-versatile");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0].message.content;
}

async function chatMistral(
  prompt: string,
  systemPrompt: string,
): Promise<string> {
  const key = await getKey("mistral");
  if (!key) throw new Error("Mistral API key not configured");
  const model = await getModel("mistral", "mistral-small-latest");
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 800,
    }),
  });
  if (!res.ok)
    throw new Error(`Mistral error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0].message.content;
}

async function chatDeepSeek(
  prompt: string,
  systemPrompt: string,
): Promise<string> {
  const key = await getKey("deepseek");
  if (!key) throw new Error("DeepSeek API key not configured");
  const model = await getModel("deepseek", "deepseek-chat");
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 800,
    }),
  });
  if (!res.ok)
    throw new Error(`DeepSeek error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0].message.content;
}

async function chatOpenRouter(
  prompt: string,
  systemPrompt: string,
): Promise<string> {
  const key = await getKey("openrouter");
  if (!key) throw new Error("OpenRouter API key not configured");
  const model = await getModel(
    "openrouter",
    "mistralai/mistral-7b-instruct:free",
  );
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://dropflow.app",
      "X-Title": "DropFlow",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });
  if (!res.ok)
    throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0].message.content;
}

async function serpSearch(
  query: string,
): Promise<{ title: string; snippet: string; link: string }[]> {
  const key = await getKey("serpapi");
  if (!key) throw new Error("SerpAPI key not configured");
  const params = new URLSearchParams({
    q: query,
    api_key: key,
    num: "5",
    engine: "google",
  });
  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) throw new Error(`SerpAPI error ${res.status}`);
  const data = (await res.json()) as {
    organic_results?: { title: string; snippet: string; link: string }[];
  };
  return data.organic_results ?? [];
}

async function tryProviders(
  prompt: string,
  systemPrompt: string,
  preferred: Provider[],
): Promise<string> {
  const all: Provider[] = [
    ...preferred,
    "groq",
    "openrouter",
    "mistral",
    "deepseek",
  ];
  const unique = [...new Set(all)];
  for (const provider of unique) {
    const key = await getKey(provider);
    if (!key) continue;
    try {
      if (provider === "groq") return await chatGroq(prompt, systemPrompt);
      if (provider === "mistral")
        return await chatMistral(prompt, systemPrompt);
      if (provider === "deepseek")
        return await chatDeepSeek(prompt, systemPrompt);
      if (provider === "openrouter")
        return await chatOpenRouter(prompt, systemPrompt);
    } catch {
      continue;
    }
  }
  throw new Error("NO_AI_KEYS");
}

export async function scoreProduct(
  name: string,
  category: string,
  costPrice?: number,
  sellPrice?: number,
): Promise<string> {
  const margin =
    costPrice && sellPrice
      ? Math.round(((sellPrice - costPrice) / sellPrice) * 100)
      : null;
  const prompt = `Analyze this dropshipping product for viral/ad potential:
Product: ${name}
Category: ${category}
${margin !== null ? `Margin: ${margin}%` : ""}

Return ONLY valid JSON (no markdown, no extra text):
{
  "viralityScore": <0-100>,
  "platformScores": { "tiktok": <0-100>, "facebook": <0-100>, "instagram": <0-100>, "google": <0-100> },
  "saturation": "<low|medium|high|very-high>",
  "trendMomentum": "<rising|stable|peaking>",
  "impulseScore": <0-100>,
  "estimatedCpm": "<e.g. $12.50>",
  "launchWindow": "<1 sentence advice>",
  "hookAngles": ["<hook 1>", "<hook 2>"],
  "verdict": "<🔥 High Potential|✅ Solid Pick|⚠️ Test First|❌ Risky>",
  "reasoning": "<2-3 sentence analysis>"
}`;
  return tryProviders(
    prompt,
    "You are a dropshipping and performance marketing expert. Return only valid JSON.",
    ["groq", "mistral", "deepseek", "openrouter"],
  );
}

export async function researchProduct(query: string): Promise<string> {
  const prompt = `Research this dropshipping product/niche: "${query}"

Return ONLY valid JSON (no markdown, no extra text):
{
  "demandScore": <0-100>,
  "competitionLevel": "<low|medium|high|very-high>",
  "suggestedPrice": <number USD>,
  "estimatedMargin": <0-100 percent>,
  "topNiches": [{"name": "<niche>", "score": <0-100>}, ...],
  "pros": ["<pro 1>", "<pro 2>", "<pro 3>"],
  "cons": ["<con 1>", "<con 2>"],
  "verdict": "<strong-buy|buy|hold|avoid>",
  "summary": "<2-3 sentence analysis>"
}`;
  return tryProviders(
    prompt,
    "You are a dropshipping market research expert. Return only valid JSON.",
    ["deepseek", "mistral", "groq", "openrouter"],
  );
}

export async function generateDescription(
  name: string,
  category: string,
  niche: string,
  sellPrice?: string,
): Promise<string> {
  const prompt = `Write a compelling product description for an online store:
Product: ${name}
Category: ${category}
Target niche: ${niche}
${sellPrice ? `Price: ${sellPrice}` : ""}

Write 3-4 sentences. Be persuasive, highlight benefits over features. No bullet points. Return only the description text.`;
  return tryProviders(
    prompt,
    "You are an expert ecommerce copywriter. Write compelling product descriptions.",
    ["groq", "openrouter", "mistral", "deepseek"],
  );
}

export async function findSuppliers(
  query: string,
  category: string,
): Promise<string> {
  let serpContext = "";
  const serpKey = await getKey("serpapi");
  if (serpKey) {
    try {
      const results = await serpSearch(
        `${query} wholesale supplier dropshipping`,
      );
      serpContext = results
        .slice(0, 3)
        .map((r) => `- ${r.title}: ${r.snippet}`)
        .join("\n");
    } catch {}
  }

  const prompt = `Find wholesale/dropshipping suppliers for: "${query}" (category: ${category})
${serpContext ? `\nWeb search context:\n${serpContext}` : ""}

Return ONLY valid JSON (no markdown):
{
  "suppliers": [
    {
      "name": "<supplier name>",
      "country": "<country>",
      "estimatedCostPrice": <number>,
      "shippingDays": <number>,
      "rating": <1-5>,
      "matchScore": <0-100>,
      "matchReason": "<reason>",
      "pros": ["<pro>", "<pro>"],
      "website": "<url or null>",
      "contactEmail": "<email or null>"
    }
  ]
}
Provide 3-4 realistic suppliers.`;
  return tryProviders(
    prompt,
    "You are a global supplier sourcing expert for dropshipping businesses. Return only valid JSON.",
    ["deepseek", "groq", "mistral", "openrouter"],
  );
}

export { getKey, tryProviders };
