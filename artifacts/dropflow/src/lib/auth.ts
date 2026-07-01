/**
 * Frontend authentication client.
 *
 * Wraps the `/api/auth/*` endpoints and exposes a small, dependency-free
 * API.  All API calls send cookies with `credentials: "include"` so the
 * auth cookie set by signup/login is forwarded automatically.
 */

const API_BASE = "/api/auth";

export interface PublicUser {
  id: number;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new AuthError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    credentials: "include",
  });
  if (res.status === 401) return null;
  if (!res.ok) {
    throw new AuthError(`${res.status} ${res.statusText}`, res.status);
  }
  return (await res.json()) as T;
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new AuthError(message, res.status);
  }
}

export const authClient = {
  async signup(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<{ user: PublicUser }> {
    return post("/signup", input);
  },
  async login(input: {
    email: string;
    password: string;
  }): Promise<{ user: PublicUser }> {
    return post("/login", input);
  },
  async logout(): Promise<void> {
    await post("/logout", {});
  },
  async me(): Promise<PublicUser | null> {
    const data = await get<{ user: PublicUser }>("/me");
    return data?.user ?? null;
  },
  async forgotPassword(email: string): Promise<void> {
    await post("/forgot-password", { email });
  },
  async resetPassword(token: string, password: string): Promise<void> {
    await post("/reset-password", { token, password });
  },
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await post("/change-password", { currentPassword, newPassword });
  },
  async verifyEmail(token: string): Promise<{ user: PublicUser }> {
    return post("/verify-email", { token });
  },
  async resendVerification(): Promise<void> {
    await post("/resend-verify", {});
  },
  async deleteAccount(): Promise<void> {
    await del("/account");
  },
  async dataExportUrl(): Promise<string> {
    // Return the URL the browser can hit directly to download JSON.
    return `${API_BASE}/data-export`;
  },
};

// Stand-alone helpers for the public auth pages (forgot/reset password).
// These match the `authClient` methods but can be imported directly
// without going through the `authClient.` prefix.
export async function forgotPassword(email: string): Promise<void> {
  await authClient.forgotPassword(email);
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  await authClient.resetPassword(token, password);
}
