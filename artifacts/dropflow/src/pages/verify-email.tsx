import { useEffect, useState } from "react";
import { Link } from "wouter";
import { authClient } from "@/lib/auth";

/**
 * Page reached from the email-verification link.  Pulls the token
 * from the URL, posts it to the API, and tells the user whether it
 * worked.  We do NOT auto-login the user (we'd need a new JWT), so
 * after a successful verify we point them to the login page.
 */
export default function VerifyEmail() {
  const [status, setStatus] = useState<"verifying" | "ok" | "error">(
    "verifying",
  );
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    authClient
      .verifyEmail(token)
      .then(() => {
        setStatus("ok");
        setMessage("Your email has been verified. You can now sign in.");
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed.");
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold tracking-tight">
          {status === "verifying"
            ? "Verifying…"
            : status === "ok"
              ? "Email verified"
              : "Verification failed"}
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">{message}</p>
        <Link
          href={status === "ok" ? "/login" : "/signup"}
          className="text-sm font-medium text-primary hover:underline"
        >
          {status === "ok" ? "Go to sign in" : "Back to sign up"}
        </Link>
      </div>
    </div>
  );
}
