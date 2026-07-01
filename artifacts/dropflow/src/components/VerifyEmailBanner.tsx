import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { authClient, AuthError } from "@/lib/auth";

/**
 * Yellow banner shown at the top of the app when the user is logged
 * in but has not yet verified their email.  Clicking "Resend" pings
 * the API; "Dismiss" hides the banner for the current session only.
 */
export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  if (!user || user.emailVerified || hidden) return null;

  async function resend() {
    setBusy(true);
    setInfo(null);
    try {
      await authClient.resendVerification();
      setInfo("Verification email sent.");
    } catch (err) {
      setInfo(
        err instanceof AuthError
          ? err.message
          : "Failed to send. Please try again later.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      className="bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-300"
    >
      <div className="flex items-center justify-between gap-3 px-6 py-2 text-sm">
        <div className="flex-1 min-w-0">
          <strong className="font-semibold">Verify your email</strong> to unlock
          all features. Check your inbox for the link.
          {info ? <span className="ml-2 text-xs">({info})</span> : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={resend}
            disabled={busy}
            className="rounded border border-amber-500/40 px-2 py-1 text-xs font-medium hover:bg-amber-500/10 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Resend"}
          </button>
          <button
            onClick={() => setHidden(true)}
            className="rounded px-2 py-1 text-xs hover:bg-amber-500/10"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
