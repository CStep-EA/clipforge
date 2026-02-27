import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import ClipForgeLogo from "@/components/shared/ClipForgeLogo";
import {
  LayoutDashboard,
  Bookmark,
  Users,
  ShoppingCart,
  BarChart3,
  Search,
  Settings,
  Shield,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Calendar,
  UserPlus,
  Sun,
  Moon,
  Plug
} from "lucide-react";

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "My Saves", icon: Bookmark, page: "Saves" },
  { name: "Friends", icon: UserPlus, page: "Friends" },
  { name: "Boards", icon: Users, page: "Boards" },
  { name: "Integrations", icon: Plug, page: "Integrations", highlight: true },
  { name: "Shopping", icon: ShoppingCart, page: "ShoppingLists" },
  { name: "Events", icon: Calendar, page: "Events" },
  { name: "Analytics", icon: BarChart3, page: "Analytics" },
  { name: "Search", icon: Search, page: "Search" },
  { name: "AI Assistant", icon: Sparkles, page: "Assistant" },
  { name: "Upgrade", icon: Zap, page: "Pricing" },
];

const bottomItems = [
  { name: "Settings", icon: Settings, page: "Settings" },
  { name: "Admin", icon: Shield, page: "Admin", adminOnly: true },
  { name: "Support", icon: MessageCircle, page: "Support" },
];

export default function Sidebar({ currentPage, userRole, theme = "dark", onToggleTheme }) {
  const [collapsed, setCollapsed] = useState(false);
  const isDark = theme === "dark";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300",
        isDark ? "bg-[#0F1117] border-r border-[#2A2D3A]" : "bg-white border-r border-gray-200 shadow-sm",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 h-16 overflow-hidden", isDark ? "border-b border-[#2A2D3A]" : "border-b border-gray-200")}>
        <ClipForgeLogo
          size={collapsed ? 32 : 36}
          showText={!collapsed}
          variant="morph"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-[#00BFFF]/10 text-[#00BFFF]"
                  : isDark
                    ? "text-[#8B8D97] hover:text-[#E8E8ED] hover:bg-[#1A1D27]"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "drop-shadow-[0_0_6px_rgba(0,191,255,0.5)]", item.highlight && !isActive && "text-[#9370DB]")} />
              {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
              {!collapsed && item.highlight && !isActive && (
                <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded-full bg-[#9370DB]/20 text-[#9370DB] font-bold">NEW</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={cn("py-3 px-2 space-y-1", isDark ? "border-t border-[#2A2D3A]" : "border-t border-gray-200")}>
        {bottomItems.map((item) => {
          if (item.adminOnly && userRole !== "admin") return null;
          const isActive = currentPage === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-[#00BFFF]/10 text-[#00BFFF]"
                  : isDark
                    ? "text-[#8B8D97] hover:text-[#E8E8ED] hover:bg-[#1A1D27]"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
            </Link>
          );
        })}
        {/* Theme toggle */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              isDark ? "text-[#8B8D97] hover:text-[#E8E8ED] hover:bg-[#1A1D27]" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            {isDark ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
            {!collapsed && <span className="text-sm font-medium">{isDark ? "Light mode" : "Dark mode"}</span>}
          </button>
        )}
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center transition-colors",
          isDark ? "bg-[#1A1D27] border border-[#2A2D3A] text-[#8B8D97] hover:text-[#00BFFF]" : "bg-white border border-gray-200 text-gray-400 hover:text-[#00BFFF] shadow-sm"
        )}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}