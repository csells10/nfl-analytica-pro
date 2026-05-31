import { forwardRef, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { CalendarDays, Target, Settings, LogOut, Sun, Moon, HelpCircle, ShieldCheck } from "lucide-react";
import gamelensHorizontal from "@/assets/gamelens-horizontal.png";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/admin-api";

const baseNavItems = [
  { label: "Games", path: "/", icon: CalendarDays },
  { label: "Matchup Lens", path: "/matchup-lens", icon: Target },
  { label: "Settings", path: "/settings", icon: Settings },
];


const GUIDE_EVENT = "gamelens:open-guide";
const GUIDE_HINT_KEY = "gamelens_guide_hint_views";

export function openGuideTutorial() {
  window.dispatchEvent(new CustomEvent(GUIDE_EVENT));
}

const AppShell = forwardRef<HTMLDivElement, { children: React.ReactNode; showGuide?: boolean }>(function AppShell({ children, showGuide = true }, ref) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  // Frontend-only UX gate. Backend remains source of truth for admin auth.
  const { data: me } = useMe(Boolean(user));
  const navItems = me?.is_admin
    ? [...baseNavItems, { label: "Admin", path: "/admin/claim-health", icon: ShieldCheck }]
    : baseNavItems;


  // Show a subtle pulse on the Guide button for the first few visits so users discover it.
  const [pulseGuide, setPulseGuide] = useState(false);
  useEffect(() => {
    try {
      const views = parseInt(localStorage.getItem(GUIDE_HINT_KEY) ?? "0", 10) || 0;
      if (views < 3) {
        setPulseGuide(true);
        localStorage.setItem(GUIDE_HINT_KEY, String(views + 1));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleGuideClick = () => {
    setPulseGuide(false);
    openGuideTutorial();
  };

  return (
    <div ref={ref} className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <img src={gamelensHorizontal} alt="GameLens" className="h-7 w-auto" />
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:block">{user?.email}</span>
            {showGuide && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGuideClick}
                aria-label="Open guide"
                title="Show the guide"
                className={`relative h-8 w-8 text-muted-foreground hover:text-foreground ${
                  pulseGuide ? "animate-pulse text-primary" : ""
                }`}
              >
                <HelpCircle className="h-4 w-4" />
                {pulseGuide && (
                  <span className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { void signOut(); }}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
});
AppShell.displayName = "AppShell";

export default AppShell;
