/**
 * Sidebar widget that displays the current user and a sign-out button.
 * Lives in its own file so the Layout component stays focused on
 * navigation.
 */
import { useAuth } from "@/contexts/auth-context";
import { LogOut } from "lucide-react";

export function UserMenu() {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-1">
      <div className="px-2.5 py-1.5 text-xs">
        <div className="truncate font-medium text-foreground">
          {user.name ?? user.email}
        </div>
        {user.name ? (
          <div className="truncate text-muted-foreground">{user.email}</div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => {
          void logout();
        }}
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <LogOut className="h-3.5 w-3.5 shrink-0" />
        Sign out
      </button>
    </div>
  );
}
