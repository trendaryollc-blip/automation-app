export type CJDropshippingConfig = {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  [key: string]: unknown;
};

export async function testCJDropshipping(
  config: CJDropshippingConfig | null,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const apiKey = config?.apiKey;
    const apiSecret = config?.apiSecret;
    const baseUrl =
      (config?.baseUrl as string | undefined) ||
      "https://api.cjdropshipping.com";

    if (!apiKey || !apiSecret) {
      return {
        ok: false,
        error: "CJ Dropshipping API key and secret are required",
      };
    }

    const url = `${baseUrl}/api/common/v1/accountInfo`;

    const params = new URLSearchParams({
      key: apiKey,
      secret: apiSecret,
    });

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as {
      data?: { email?: string } | null;
      message?: string;
      msg?: string;
    };

    if (response.ok && data.data) {
      return {
        ok: true,
        message: `Connected as ${data.data.email || "CJ Dropshipping account"}`,
      };
    }

    const errorMessage = data.message || data.msg || "Invalid credentials";
    return { ok: false, error: `CJ Dropshipping error: ${errorMessage}` };
  } catch (error) {
    return {
      ok: false,
      error: `CJ Dropshipping connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function placeCJOrder(params: {
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
  const apiKey = process.env.CJ_API_KEY;
  const apiSecret = process.env.CJ_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("CJ Dropshipping API credentials not configured");
  }

  const baseUrl = process.env.CJ_BASE_URL || "https://api.cjdropshipping.com";
  const url = `${baseUrl}/api/order/v1/createOrder`;

  // Placeholder implementation - would need real API contract
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key: apiKey,
      secret: apiSecret,
      productId: params.productId,
      quantity: params.quantity,
      shippingInfo: params.shippingInfo,
    }),
  });

  if (!response.ok) {
    throw new Error(`CJ order failed: ${response.status}`);
  }

  return response.json();
}

export async function getCJInventory(productId: string) {
  const apiKey = process.env.CJ_API_KEY;
  const apiSecret = process.env.CJ_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("CJ Dropshipping API credentials not configured");
  }

  const baseUrl = process.env.CJ_BASE_URL || "https://api.cjdropshipping.com";
  const url = `${baseUrl}/api/product/v1/getProductInfo`;

  const params = new URLSearchParams({
    key: apiKey,
    secret: apiSecret,
    productId,
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`CJ inventory check failed: ${response.status}`);
  }

  const data = (await response.json()) as { data?: unknown };
  return data.data;
}
