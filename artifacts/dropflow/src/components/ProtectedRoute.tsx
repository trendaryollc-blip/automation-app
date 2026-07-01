import { Redirect, Route, useLocation } from "wouter";
import type { ComponentType } from "react";
import { useAuth } from "@/contexts/auth-context";

/**
 * Wrap any route component to require authentication.  Unauthenticated
 * users are redirected to /login, with the original destination
 * preserved in the `?next=` query parameter so they bounce back after
 * signing in.
 */
export function ProtectedRoute({
  component: Component,
  ...rest
}: {
  component: ComponentType;
  path?: string;
}) {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location);
    return <Redirect to={`/login?next=${next}`} />;
  }

  return <Route {...rest} component={Component} />;
}
