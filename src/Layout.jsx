import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import ClipForgeLogo from "@/components/shared/ClipForgeLogo";
import { base44 } from "@/api/base44Client";
import { Sun, Moon } from "lucide-react";
import SupportBot from "@/components/support/SupportBot";
import CookieBanner from "@/components/shared/CookieBanner";
import GetAppButton from "@/components/shared/GetAppButton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { SentryErrorBoundary, initSentry } from "@/components/shared/SentryInit";

// Init Sentry as early as possible
initSentry();

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cf-theme") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    localStorage.setItem("cf-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#0F1117] text-[#E8E8ED]" : "bg-[#F5F5F7] text-[#1A1D27]"} ${theme}`}>
      <style>{`
        /* ── Dark mode (default) ─────────────────────────── */
        :root, .dark {
          --background:    222 15% 7%;
          --foreground:    240 6% 93%;
          --card:          225 14% 12%;
          --card-foreground: 240 6% 93%;
          --popover:       225 14% 12%;
          --popover-foreground: 240 6% 93%;

          /* PRIMARY → neon blue #00BFFF */
          --primary:           195 100% 50%;
          --primary-foreground: 220 15% 8%;

          /* SECONDARY → purple #9370DB */
          --secondary:           263 47% 58%;
          --secondary-foreground: 0 0% 100%;

          /* ACCENT → soft pink #FFB6C1 */
          --accent:           351 100% 86%;
          --accent-foreground: 220 15% 8%;

          --muted:            225 14% 18%;
          --muted-foreground: 240 4% 57%;
          --destructive:      0 72% 51%;
          --destructive-foreground: 0 0% 98%;
          --border:  225 14% 18%;
          --input:   225 14% 18%;
          --ring:    195 100% 50%;
          --radius:  0.65rem;

          /* Charts */
          --chart-1: 195 100% 50%;
          --chart-2: 263 47% 58%;
          --chart-3: 351 100% 86%;
          --chart-4: 45 93% 47%;
          --chart-5: 160 60% 40%;

          /* Sidebar */
          --sidebar-background:        222 15% 7%;
          --sidebar-foreground:        240 6% 93%;
          --sidebar-primary:           195 100% 50%;
          --sidebar-primary-foreground: 220 15% 8%;
          --sidebar-accent:            225 14% 18%;
          --sidebar-accent-foreground: 240 6% 93%;
          --sidebar-border:            225 14% 18%;
          --sidebar-ring:              195 100% 50%;
        }

        /* ── Light mode ──────────────────────────────────── */
        .light {
          --background:    0 0% 98%;
          --foreground:    220 15% 10%;
          --card:          0 0% 100%;
          --card-foreground: 220 15% 10%;
          --popover:       0 0% 100%;
          --popover-foreground: 220 15% 10%;

          --primary:           195 100% 40%;   /* slightly darker neon for contrast */
          --primary-foreground: 0 0% 100%;

          --secondary:           263 47% 52%;
          --secondary-foreground: 0 0% 100%;

          --accent:           351 100% 78%;
          --accent-foreground: 220 15% 10%;

          --muted:            210 10% 94%;
          --muted-foreground: 215 12% 45%;
          --destructive:      0 72% 51%;
          --destructive-foreground: 0 0% 98%;
          --border:  210 10% 88%;
          --input:   210 10% 88%;
          --ring:    195 100% 40%;
          --radius:  0.65rem;

          --chart-1: 195 100% 40%;
          --chart-2: 263 47% 52%;
          --chart-3: 351 100% 74%;
          --chart-4: 45 93% 42%;
          --chart-5: 160 60% 35%;

          --sidebar-background:        0 0% 97%;
          --sidebar-foreground:        220 15% 10%;
          --sidebar-primary:           195 100% 40%;
          --sidebar-primary-foreground: 0 0% 100%;
          --sidebar-accent:            210 10% 92%;
          --sidebar-accent-foreground: 220 15% 10%;
          --sidebar-border:            210 10% 88%;
          --sidebar-ring:              195 100% 40%;
        }

        /* ── Global button overrides ─────────────────────── */
        button[class*="bg-primary"], a[class*="bg-primary"] {
          transition: filter 0.15s ease, transform 0.15s ease;
        }
        button[class*="bg-primary"]:hover, a[class*="bg-primary"]:hover {
          filter: brightness(1.12);
        }

        /* ── Link accent colour ──────────────────────────── */
        a:not([class]):hover {
          color: hsl(var(--accent));
        }

        /* PWA safe area */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        }
      `}</style>

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar currentPage={currentPageName} userRole={user?.role} theme={theme} onToggleTheme={toggleTheme} />
      </div>

      {/* Mobile top header with logo */}
      <div className={`md:hidden flex items-center justify-between px-4 pt-4 pb-2 ${isDark ? "border-b border-[#2A2D3A]" : "border-b border-gray-200"}`}>
        <ClipForgeLogo size={36} showText variant="morph" />
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl transition-all ${isDark ? "bg-[#1A1D27] text-[#8B8D97] hover:text-[#00BFFF]" : "bg-white text-gray-500 hover:text-[#00BFFF] shadow-sm border border-gray-200"}`}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main content */}
      <main className="md:ml-[240px] pb-20 md:pb-8 pb-safe min-h-screen">
        {children}
      </main>

      {/* Mobile nav */}
      <MobileNav currentPage={currentPageName} userRole={user?.role} />

      {/* Floating support bot (not on Support or Admin page) */}
      {currentPageName !== "Support" && currentPageName !== "Admin" && (
        <SupportBot user={user} floating={true} />
      )}

      {/* Cookie consent banner */}
      <CookieBanner />

      {/* PWA install button */}
      <GetAppButton />

      {/* Footer links */}
      <div className={`hidden md:flex fixed bottom-0 left-[240px] right-0 z-50 px-6 py-2 justify-between items-center gap-4 text-[10px] pointer-events-auto ${isDark ? "text-[#8B8D97] border-t border-[#2A2D3A] bg-[#0F1117]/80" : "text-gray-400 border-t border-gray-200 bg-white/80"} backdrop-blur-sm`}>
        <div className="flex items-center gap-3 flex-wrap">
          <Link to={createPageUrl("Support")} className="hover:text-[#00BFFF] transition-colors font-medium">Support</Link>
          <Link to={createPageUrl("Privacy")} className="hover:text-[#00BFFF] transition-colors">Privacy</Link>
          <Link to={createPageUrl("Terms")} className="hover:text-[#00BFFF] transition-colors">Terms</Link>
          <Link to={createPageUrl("Cookies")} className="hover:text-[#00BFFF] transition-colors">Cookies</Link>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <Link to={createPageUrl("About")} className="hover:text-[#00BFFF] transition-colors">About</Link>
          <Link to={createPageUrl("VisionMission")} className="hover:text-[#00BFFF] transition-colors">Vision</Link>
          <Link to={createPageUrl("LaunchRoadmap")} className="hover:text-[#00BFFF] transition-colors">Roadmap</Link>
          <Link to={createPageUrl("Pricing")} className="hover:text-[#9370DB] transition-colors font-medium">Pricing</Link>
          <Link to={createPageUrl("Readme")} className="hover:text-[#FFB6C1] transition-colors">README</Link>
          <span>© 2026 ClipForge</span>
        </div>
      </div>
    </div>
    </SentryErrorBoundary>
  );
}