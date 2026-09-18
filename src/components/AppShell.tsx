import { forwardRef, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { CalendarDays, ChevronDown, Settings, LogOut, Sun, Moon, HelpCircle, ShieldCheck } from "lucide-react";
import gamelensHorizontalLight from "@/assets/gamelens-horizontal-light.png";
import gamelensHorizontalDark from "@/assets/gamelens-horizontal-dark.png";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/admin-api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const primaryNavItems = [{ label: "Matchups", path: "/", icon: CalendarDays }];

const GUIDE_EVENT = "gamelens:open-guide";
const GUIDE_HINT_KEY = "gamelens_guide_hint_views";

export function openGuideTutorial() {
  window.dispatchEvent(new CustomEvent(GUIDE_EVENT));
}

const AppShell = forwardRef<HTMLDivElement, { children: React.ReactNode; showGuide?: boolean }>(function AppShell({ children, showGuide = true }, ref) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const isMatchupLens = location.pathname === "/matchup-lens";
  // Frontend-only UX gate. Backend remains source of truth for admin auth.
  const { data: me } = useMe(Boolean(user));
  const displayName = user?.name || user?.email?.split("@")[0] || "Account";

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
          <div className="flex min-w-0 items-center gap-2 lg:gap-6">
            <Link to="/" className="flex items-center gap-2">
              <img src={gamelensHorizontalLight} alt="GameLens" className="h-9 w-auto dark:hidden" />
              <img src={gamelensHorizontalDark} alt="GameLens" className="hidden h-9 w-auto dark:block" />
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {primaryNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
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
            {isMatchupLens && (
              <div className="flex shrink-0 items-center gap-2" data-testid="lab-context">
                <span className="h-5 w-px bg-border" aria-hidden="true" />
                <h1 className="text-sm font-semibold text-muted-foreground">Lab</h1>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 max-w-[10rem] gap-1 px-2 text-primary hover:bg-primary/10 hover:text-primary sm:max-w-[14rem]"
                  aria-label={`Open account menu for ${displayName}`}
                >
                  <span className="truncate text-sm font-semibold">{displayName}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="gap-2">
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                {me?.is_admin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/claim-health" className="gap-2">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => { void signOut(); }} className="gap-2">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* Compact mobile tab row mirrors the single primary destination. */}
        <nav className="flex items-stretch border-t border-border md:hidden" aria-label="Primary">
          {primaryNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>
      <main className={`mx-auto max-w-7xl px-4 ${isMatchupLens ? "pb-6" : "py-6"}`}>
        {children}
      </main>

    </div>
  );
});
AppShell.displayName = "AppShell";

export default AppShell;
