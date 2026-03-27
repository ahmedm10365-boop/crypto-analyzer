import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Recommendations from "@/pages/Recommendations";
import Analysis from "@/pages/Analysis";
import WatchlistPage from "@/pages/WatchlistPage";
import CoinDetail from "@/pages/CoinDetail";
import NotFound from "@/pages/not-found";

function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/recommendations" component={Recommendations} />
          <Route path="/analysis" component={Analysis} />
          <Route path="/watchlist" component={WatchlistPage} />
          <Route path="/coin/:id" component={CoinDetail} />
          <Route component={NotFound} />
        </Switch>
        <footer className="shrink-0 py-2 text-center text-[10px] text-muted-foreground/50 border-t border-border/30">
          <a
            href="https://www.perplexity.ai/computer"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            Created with Perplexity Computer
          </a>
        </footer>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppLayout />
          </Router>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
