export type ZendropConfig = {
  apiKey?: string;
  baseUrl?: string;
  [key: string]: unknown;
};

export async function testZendrop(config: ZendropConfig | null): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const apiKey = config?.apiKey;
    const baseUrl = (config?.baseUrl as string | undefined) || "https://api.zendrop.com";

    if (!apiKey) {
      return { ok: false, error: "Zendrop API key is required" };
    }

    const url = `${baseUrl}/v1/account`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as { data?: { email?: string } | null; message?: string; error?: string };

    if (response.ok && data.data) {
      return { ok: true, message: `Connected as ${data.data.email || "Zendrop account"}` };
    }

    const errorMessage = data.message || data.error || "Invalid API key";
    return { ok: false, error: `Zendrop error: ${errorMessage}` };
  } catch (error) {
    return { ok: false, error: `Zendrop connection failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

export async function placeZendropOrder(params: {
  productId: string;
  quantity: number;
  shippingInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}) {
  const apiKey = process.env.ZENDROP_API_KEY;

  if (!apiKey) {
    throw new Error("Zendrop API key not configured");
  }

  const baseUrl = process.env.ZENDROP_BASE_URL || "https://api.zendrop.com";
  const url = `${baseUrl}/v1/orders`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId: params.productId,
      quantity: params.quantity,
      shipping: params.shippingInfo,
    }),
  });

  if (!response.ok) {
    throw new Error(`Zendrop order failed: ${response.status}`);
  }

  return response.json();
}

export async function getZendropInventory(productId: string) {
  const apiKey = process.env.ZENDROP_API_KEY;

  if (!apiKey) {
    throw new Error("Zendrop API key not configured");
  }

  const baseUrl = process.env.ZENDROP_BASE_URL || "https://api.zendrop.com";
  const url = `${baseUrl}/v1/products/${productId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Zendrop inventory check failed: ${response.status}`);
  }

  const data = (await response.json()) as { data?: unknown };
  return data.data;
}
