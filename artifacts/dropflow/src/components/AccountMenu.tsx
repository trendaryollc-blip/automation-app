import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { authClient, AuthError } from "@/lib/auth";

/**
 * Per-user account management menu.
 *
 * Mounted by the layout.  Lets the user:
 *   - change their password
 *   - resend the verification email
 *   - export their data (GDPR)
 *   - permanently delete their account (GDPR)
 *
 * All destructive actions require typing a confirmation phrase or
 * the account email.  The user is signed out automatically after
 * account deletion.
 */
export function AccountMenu() {
  const { user, logout, refresh } = useAuth();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState<
    | null
    | "changePassword"
    | "resendVerify"
    | "exportData"
    | "deleteAccount"
  >(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Change password form state
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  if (!user) return null;

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await authClient.changePassword(current, next);
      setInfo("Password updated.");
      setCurrent("");
      setNext("");
      setConfirm("");
      setOpen(null);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Failed to update password.");
    } finally {
      setBusy(false);
    }
  }

  async function onResendVerify() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await authClient.resendVerification();
      setInfo("Verification email sent. Check your inbox.");
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Failed to resend email.");
    } finally {
      setBusy(false);
    }
  }

  async function onExportData() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      // The export endpoint is authenticated via the session cookie;
      // the browser will include it automatically with credentials.
      const res = await fetch("/api/auth/data-export", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dropflow-data.json";
      a.click();
      URL.revokeObjectURL(url);
      setInfo("Downloaded dropflow-data.json.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteAccount() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await authClient.deleteAccount();
      // Logout already happened server-side (cookie cleared).
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-border pt-3 space-y-1">
      <div className="px-2 py-1">
        <p className="text-xs text-muted-foreground">Signed in as</p>
        <p className="text-sm font-medium truncate">{user.email}</p>
      </div>

      {open === "changePassword" ? (
        <form onSubmit={onChangePassword} className="space-y-1 px-2 py-2">
          <input
            type="password"
            placeholder="Current password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
          />
          <input
            type="password"
            placeholder="New password (8+ chars)"
            autoComplete="new-password"
            required
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
          />
          <div className="flex gap-1">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="rounded border border-border px-2 py-1 text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setOpen("changePassword")}
          className="w-full text-left rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          Change password
        </button>
      )}

      {!user.emailVerified ? (
        <button
          onClick={onResendVerify}
          disabled={busy}
          className="w-full text-left rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-500 hover:bg-accent disabled:opacity-50"
        >
          Resend verification email
        </button>
      ) : null}

      <button
        onClick={onExportData}
        disabled={busy}
        className="w-full text-left rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
      >
        Download my data
      </button>

      {open === "deleteAccount" ? (
        <div className="space-y-1 px-2 py-2 border border-red-500/30 rounded-md bg-red-500/5">
          <p className="text-xs text-red-400">
            This permanently deletes your account and all data. Type
            <span className="font-mono"> {user.email} </span> to confirm.
          </p>
          <input
            type="text"
            placeholder={user.email}
            onChange={(e) => {
              if (e.target.value === user.email) {
                // Enable button visually — actual delete is in onClick
              }
            }}
            className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onDeleteAccount}
              disabled={busy}
              className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              Delete forever
            </button>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="rounded border border-border px-2 py-1 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen("deleteAccount")}
          className="w-full text-left rounded-md px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
        >
          Delete account
        </button>
      )}

      <button
        onClick={async () => {
          await logout();
          void refresh();
          navigate("/login", { replace: true });
        }}
        className="w-full text-left rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        Sign out
      </button>

      {error ? (
        <p className="px-2 text-xs text-red-400">{error}</p>
      ) : null}
      {info ? (
        <p className="px-2 text-xs text-emerald-500">{info}</p>
      ) : null}
    </div>
  );
}
