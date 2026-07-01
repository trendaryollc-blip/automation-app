import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Component, ErrorInfo, ReactNode } from "react";
import NotFound from "@/pages/not-found";

import { AuthProvider } from "./contexts/auth-context";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/login";
import Signup from "./pages/signup";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import Terms from "./pages/terms";
import Privacy from "./pages/privacy";
import VerifyEmail from "./pages/verify-email";

import Layout from "./components/layout";
import Dashboard from "./pages/dashboard";
import Products from "./pages/products";
import ProductDetail from "./pages/product-detail";
import Research from "./pages/research";
import Suppliers from "./pages/suppliers";
import SupplierFinder from "./pages/supplier-finder";
import SupplierDetail from "./pages/supplier-detail";
import Orders from "./pages/orders";
import OrderDetail from "./pages/order-detail";
import MarginCalculator from "./pages/margin-calculator";
import PriceWatch from "./pages/price-watch";
import PlReport from "./pages/pl-report";
import Reorder from "./pages/reorder";
import Notifications from "./pages/notifications";
import SettingsPage from "./pages/settings";
import ImportPage from "./pages/import";
import AnalyticsPage from "./pages/analytics";
import PurchaseOrdersPage from "./pages/purchase-orders";
import ReturnsPage from "./pages/returns";
import CustomersPage from "./pages/customers";
import VelocityPage from "./pages/velocity";
import PromotionsPage from "./pages/promotions";
import CashFlowPage from "./pages/cash-flow";
import ProductScorerPage from "./pages/product-scorer";
import LaunchesPage from "./pages/launches";
import AdSpendPage from "./pages/ad-spend";
import StoreConnectionsPage from "./pages/store-connections";
import AISettingsPage from "./pages/ai-settings";
import FulfillmentPage from "./pages/fulfillment";
import ProductHuntingPage from "./pages/product-hunting";
import CustomerIntelligencePage from "./pages/customer-intelligence";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Top-level error boundary.  Catches uncaught render errors anywhere
 * in the tree, logs them, and shows a friendly fallback.  Without
 * this, an exception in any component would unmount the whole app.
 */
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Uncaught render error", { error, info });
    // Optional: report to a future Sentry / telemetry endpoint.
    const dsn = (import.meta as unknown as { env?: Record<string, string> })
      .env?.VITE_SENTRY_DSN;
    if (!dsn) return;
    try {
      fetch(dsn, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          info: info.componentStack,
        }),
        keepalive: true,
      }).catch(() => {
        /* best-effort */
      });
    } catch {
      /* ignore */
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
            <h1 className="text-lg font-semibold tracking-tight">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The page hit an unexpected error. Please refresh, and if the
              problem persists, contact support.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Helper: render a route inside the authenticated layout.  Every
 * business page goes through this so that unauthenticated users are
 * redirected to /login and the page chrome (sidebar, etc.) is shared.
 */
const Authed = ({ Component }: { Component: React.ComponentType }) => (
  <Layout>
    <Component />
  </Layout>
);

function Router() {
  return (
    <Switch>
      {/* Public auth routes — no chrome, no ProtectedRoute. */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />

      {/* Everything else requires authentication. */}
      <Route path="/">
        <Authed Component={Dashboard} />
      </Route>
      <Route path="/products">
        <Authed Component={Products} />
      </Route>
      <Route path="/products/:id">
        <Authed Component={ProductDetail} />
      </Route>
      <Route path="/research">
        <Authed Component={Research} />
      </Route>
      <Route path="/suppliers">
        <Authed Component={Suppliers} />
      </Route>
      <Route path="/suppliers/find">
        <Authed Component={SupplierFinder} />
      </Route>
      <Route path="/suppliers/:id">
        <Authed Component={SupplierDetail} />
      </Route>
      <Route path="/orders">
        <Authed Component={Orders} />
      </Route>
      <Route path="/orders/:id">
        <Authed Component={OrderDetail} />
      </Route>
      <Route path="/margin-calculator">
        <Authed Component={MarginCalculator} />
      </Route>
      <Route path="/price-watch">
        <Authed Component={PriceWatch} />
      </Route>
      <Route path="/pl-report">
        <Authed Component={PlReport} />
      </Route>
      <Route path="/reorder">
        <Authed Component={Reorder} />
      </Route>
      <Route path="/notifications">
        <Authed Component={Notifications} />
      </Route>
      <Route path="/settings">
        <Authed Component={SettingsPage} />
      </Route>
      <Route path="/import">
        <Authed Component={ImportPage} />
      </Route>
      <Route path="/analytics">
        <Authed Component={AnalyticsPage} />
      </Route>
      <Route path="/purchase-orders">
        <Authed Component={PurchaseOrdersPage} />
      </Route>
      <Route path="/returns">
        <Authed Component={ReturnsPage} />
      </Route>
      <Route path="/customers">
        <Authed Component={CustomersPage} />
      </Route>
      <Route path="/velocity">
        <Authed Component={VelocityPage} />
      </Route>
      <Route path="/promotions">
        <Authed Component={PromotionsPage} />
      </Route>
      <Route path="/cash-flow">
        <Authed Component={CashFlowPage} />
      </Route>
      <Route path="/product-scorer">
        <Authed Component={ProductScorerPage} />
      </Route>
      <Route path="/launches">
        <Authed Component={LaunchesPage} />
      </Route>
      <Route path="/ad-spend">
        <Authed Component={AdSpendPage} />
      </Route>
      <Route path="/store-connections">
        <Authed Component={StoreConnectionsPage} />
      </Route>
      <Route path="/ai-settings">
        <Authed Component={AISettingsPage} />
      </Route>
      <Route path="/fulfillment">
        <Authed Component={FulfillmentPage} />
      </Route>
      <Route path="/product-hunting">
        <Authed Component={ProductHuntingPage} />
      </Route>
      <Route path="/customer-intelligence">
        <Authed Component={CustomerIntelligencePage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
