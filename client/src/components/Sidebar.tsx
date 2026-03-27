import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  TrendingUp,
  Star,
  BarChart3,
  Sun,
  Moon,
  Activity,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";

const navItems = [
  { path: "/", label: "نظرة عامة", icon: LayoutDashboard },
  { path: "/recommendations", label: "التوصيات", icon: TrendingUp },
  { path: "/analysis", label: "التحليل الفني", icon: BarChart3 },
  { path: "/watchlist", label: "المفضلة", icon: Star },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="w-[220px] h-screen flex flex-col border-r border-border bg-sidebar shrink-0" dir="rtl">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">كريبتو محلل</h1>
            <p className="text-[11px] text-muted-foreground">تحليل فني متقدم</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div
                data-testid={`nav-${item.path.replace("/", "") || "home"}`}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle + Footer */}
      <div className="p-3 border-t border-border space-y-3">
        <button
          data-testid="button-theme-toggle"
          onClick={toggleTheme}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}</span>
        </button>
        <div className="px-3">
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
            البيانات للأغراض التعليمية فقط.
            <br />
            ليست نصيحة مالية.
          </p>
        </div>
      </div>
    </aside>
  );
}
