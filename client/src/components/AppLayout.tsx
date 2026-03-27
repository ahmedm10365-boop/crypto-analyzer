import { Link, useLocation } from "wouter";
import { useTheme } from "./ThemeProvider";
import { PerplexityAttribution } from "./PerplexityAttribution";
import {
  LayoutDashboard,
  TrendingUp,
  Sun,
  Moon,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: BarChart3 },
];

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="CryptoScope Logo">
      <rect width="28" height="28" rx="6" fill="currentColor" className="text-primary" />
      <path
        d="M8 14C8 10.686 10.686 8 14 8C17.314 8 20 10.686 20 14C20 17.314 17.314 20 14 20"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 11V17M11 14H17"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r border-sidebar-border bg-sidebar flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2.5">
          <Logo />
          <span className="font-semibold text-sm tracking-tight">CryptoScope</span>
        </div>

        <nav className="flex-1 px-2 py-1 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-full justify-start gap-2 text-xs text-sidebar-foreground/70"
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>
          <PerplexityAttribution />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
