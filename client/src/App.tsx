import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import AuthGuard from "@/components/AuthGuard";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import AddAsset from "@/pages/AddAsset";
import Assets from "@/pages/Assets";
import Transfer from "@/pages/Transfer";
import Repair from "@/pages/Repair";
import UserManagement from "@/pages/UserManagement";
import Login from "@/pages/Login";
import ConnectionTest from "@/pages/ConnectionTest";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/connection-test" component={ConnectionTest} />
      <Route path="*">
        <AuthGuard>
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/add-asset" component={AddAsset} />
              <Route path="/assets" component={Assets} />
              <Route path="/transfer" component={Transfer} />
              <Route path="/repair" component={Repair} />
              <Route path="/users" component={UserManagement} />
              <Route path="/connection-test" component={ConnectionTest} />
              <Route path="/reports" component={() => <div className="p-6"><h1>Reports - Coming Soon</h1></div>} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </AuthGuard>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="inventory-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
