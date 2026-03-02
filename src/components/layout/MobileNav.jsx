/**
 * MobileNav.jsx — ClipForge grandma-proof bottom navigation
 *
 * Changes from original:
 * - 3 primary tabs (Home, Saves, More) — not 4/5
 * - Tab height raised to 64 px, icons w-6 h-6, labels text-xs (12 px)
 * - min-tap-target enforced via min-h-[56px] min-w-[72px]
 * - "More" drawer labels bumped to text-xs
 * - Removed "Connect" from primary (moved to More)
 * - Focus-visible ring for keyboard/switch-access
 * - aria-current="page" on active tab
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Bookmark, MoreHorizontal,
  Plug, Users, ShoppingCart, BarChart3, Sparkles, Calendar,
  UserPlus, Settings, MessageCircle, Info, Zap, X,
  TrendingUp, Shield, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const primaryItems = [
  { name: "Home",  icon: LayoutDashboard, page: "Dashboard" },
  { name: "Saves", icon: Bookmark,        page: "Saves" },
];

const moreItems = [
  { name: "Connect",      icon: Plug,         page: "Integrations" },
  { name: "Friends",      icon: UserPlus,     page: "Friends" },
  { name: "Boards",       icon: Users,        page: "Boards" },
  { name: "Events",       icon: Calendar,     page: "Events" },
  { name: "Shopping",     icon: ShoppingCart, page: "ShoppingLists" },
  { name: "Analytics",    icon: BarChart3,    page: "Analytics" },
  { name: "AI Assistant", icon: Sparkles,     page: "Assistant" },
  { name: "Upgrade",      icon: Zap,          page: "Pricing" },
  { name: "Settings",     icon: Settings,     page: "Settings" },
  { name: "Support",      icon: MessageCircle,page: "Support" },
  { name: "FAQ",          icon: HelpCircle,   page: "FAQ" },
  { name: "About",        icon: Info,         page: "About" },
];

const adminMoreItems = [
  { name: "Admin",     icon: Shield,     page: "Admin",          adminOnly: true },
  { name: "Marketing", icon: TrendingUp, page: "MarketingLaunch", adminOnly: true },
];

export default function MobileNav({ currentPage, userRole }) {
  const [open, setOpen] = useState(false);

  const isMoreActive = [...moreItems, ...adminMoreItems].some(
    (i) => i.page === currentPage
  );

  const allMoreItems =
    userRole === "admin" ? [...moreItems, ...adminMoreItems] : moreItems;

  return (
    <>
      {/* ── Drawer backdrop ──────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── More drawer ──────────────────────────────────────── */}
      <div
        className={cn(
          "fixed bottom-[64px] left-0 right-0 z-50 md:hidden transition-all duration-300",
          open
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-4 opacity-0 pointer-events-none"
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label="All pages"
      >
        <div className="mx-3 mb-2 bg-[#1A1D27]/98 backdrop-blur-xl border border-[#2A2D3A] rounded-2xl p-4 shadow-2xl">
          {/* Drawer header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-[#8B8D97] uppercase tracking-widest">
              All Pages
            </span>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl text-[#8B8D97] hover:text-[#E8E8ED] min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grid of nav items — 3 columns for wider tap targets */}
          <div className="grid grid-cols-3 gap-2">
            {allMoreItems.map((item) => {
              const isActive = currentPage === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all",
                    "min-h-[72px] justify-center",
                    isActive
                      ? "bg-[#00BFFF]/10 text-[#00BFFF]"
                      : "text-[#8B8D97] hover:text-[#E8E8ED] hover:bg-[#2A2D3A]"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-6 h-6",
                      isActive && "drop-shadow-[0_0_6px_rgba(0,191,255,0.5)]"
                    )}
                  />
                  <span className="text-xs font-medium text-center leading-tight">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom tab bar ────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0F1117]/97 backdrop-blur-xl border-t border-[#2A2D3A] px-2 pb-[env(safe-area-inset-bottom,8px)]"
        role="navigation"
        aria-label="Mobile navigation"
      >
        {/* 64px total height — 56px tap target for primary items */}
        <div className="flex items-center justify-around h-16">
          {primaryItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.name}
                className={cn(
                  "flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-all",
                  "min-w-[72px] min-h-[56px] justify-center",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]",
                  isActive ? "text-[#00BFFF]" : "text-[#8B8D97]"
                )}
              >
                <item.icon
                  className={cn(
                    "w-6 h-6",
                    isActive && "drop-shadow-[0_0_6px_rgba(0,191,255,0.5)]"
                  )}
                />
                <span className="text-xs font-semibold">{item.name}</span>
                {isActive && (
                  <div className="w-5 h-0.5 rounded-full bg-[#00BFFF]" />
                )}
              </Link>
            );
          })}

          {/* ── More button ───────────────────────────────────── */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            aria-haspopup="dialog"
            className={cn(
              "flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-all",
              "min-w-[72px] min-h-[56px] justify-center",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]",
              open || isMoreActive ? "text-[#00BFFF]" : "text-[#8B8D97]"
            )}
          >
            <MoreHorizontal
              className={cn(
                "w-6 h-6",
                (open || isMoreActive) &&
                  "drop-shadow-[0_0_6px_rgba(0,191,255,0.5)]"
              )}
            />
            <span className="text-xs font-semibold">More</span>
            {isMoreActive && !open && (
              <div className="w-5 h-0.5 rounded-full bg-[#00BFFF]" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
