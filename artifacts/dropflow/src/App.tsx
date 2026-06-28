import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

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

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/products" component={Products} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/research" component={Research} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/suppliers/find" component={SupplierFinder} />
        <Route path="/suppliers/:id" component={SupplierDetail} />
        <Route path="/orders" component={Orders} />
        <Route path="/orders/:id" component={OrderDetail} />
        <Route path="/margin-calculator" component={MarginCalculator} />
        <Route path="/price-watch" component={PriceWatch} />
        <Route path="/pl-report" component={PlReport} />
        <Route path="/reorder" component={Reorder} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/import" component={ImportPage} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/purchase-orders" component={PurchaseOrdersPage} />
        <Route path="/returns" component={ReturnsPage} />
        <Route path="/customers" component={CustomersPage} />
        <Route path="/velocity" component={VelocityPage} />
        <Route path="/promotions" component={PromotionsPage} />
        <Route path="/cash-flow" component={CashFlowPage} />
        <Route path="/product-scorer" component={ProductScorerPage} />
        <Route path="/launches" component={LaunchesPage} />
        <Route path="/ad-spend" component={AdSpendPage} />
        <Route path="/store-connections" component={StoreConnectionsPage} />
        <Route path="/ai-settings" component={AISettingsPage} />
        <Route path="/fulfillment" component={FulfillmentPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
