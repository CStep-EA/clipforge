import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Bookmark, TrendingUp, ShoppingCart, Users,
  Plus, ArrowRight, Sparkles, Zap, Calendar, UserPlus
} from "lucide-react";
import TrialBanner from "@/components/subscription/TrialBanner";
import ChildSafeBanner from "@/components/family/ChildSafeBanner";
import ClipForgeLogo from "@/components/shared/ClipForgeLogo";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import StatsCard from "@/components/shared/StatsCard";
import SavedItemCard from "@/components/shared/SavedItemCard";
import AddItemDialog from "@/components/shared/AddItemDialog";
import { useSubscription } from "@/components/shared/useSubscription";
import TrendCharts from "@/components/dashboard/TrendCharts";
import SharingModePanel from "@/components/dashboard/SharingModePanel";
import DashboardSearch from "@/components/dashboard/DashboardSearch";

// AI-driven priority ranking: deals first, then by rating, then recent
function rankItems(items) {
  const PRIORITY = { deal: 5, product: 4, recipe: 3, gift_idea: 3, event: 2, travel: 2, article: 1, other: 0 };
  return [...items].sort((a, b) => {
    const pa = (PRIORITY[a.category] || 0) + (a.rating || 0) / 10 + (a.is_favorite ? 2 : 0);
    const pb = (PRIORITY[b.category] || 0) + (b.rating || 0) / 10 + (b.is_favorite ? 2 : 0);
    return pb - pa;
  });
}

export default function Dashboard() {
  const [addOpen, setAddOpen] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const { user, isPro, isFamily, plan } = useSubscription();
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ["savedItems"],
    queryFn: () => base44.entities.SavedItem.list("-created_date", 50),
  });

  const { data: boards = [] } = useQuery({
    queryKey: ["boards"],
    queryFn: () => base44.entities.SharedBoard.list("-created_date", 5),
  });

  const handleSave = async (formData) => {
    await base44.entities.SavedItem.create(formData);
    queryClient.invalidateQueries({ queryKey: ["savedItems"] });
  };

  const handleToggleFavorite = async (item) => {
    await base44.entities.SavedItem.update(item.id, { is_favorite: !item.is_favorite });
    queryClient.invalidateQueries({ queryKey: ["savedItems"] });
  };

  const handleDelete = async (item) => {
    await base44.entities.SavedItem.delete(item.id);
    queryClient.invalidateQueries({ queryKey: ["savedItems"] });
  };

  const stats = {
    total: items.length,
    deals: items.filter(i => i.category === "deal").length,
    favorites: items.filter(i => i.is_favorite).length,
    boards: boards.length,
  };

  const displayItems = useMemo(() => {
    const pool = searchResults !== null ? searchResults : rankItems(items);
    return pool.slice(0, 6);
  }, [items, searchResults]);

  // Detect child-safe mode: family member with child_safe_mode (passed via URL param or user attribute)
  const isChildSafe = user?.child_safe_mode === true;

  return (
    <div className="space-y-0">
    <TrialBanner user={user} plan={plan} />
    {isChildSafe && <ChildSafeBanner />}
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ClipForgeLogo size={32} variant="loading" />
            <h1 className="text-2xl md:text-3xl font-black tracking-tight gradient-text">ClipForge</h1>
          </div>
          <p className="text-[#8B8D97] text-sm">
            Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
            <span className="inline-block ml-2 animate-float">✨</span>
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-2 btn-glow animate-gradient-shift animate-btn-pulse font-bold text-sm uppercase tracking-wide"
        >
          <Plus className="w-4 h-4" /> Quick Save
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Saves" value={stats.total} icon={Bookmark} accent="#00BFFF" trend={12} className="animate-pulse-glow" />
        <StatsCard title="Active Deals" value={stats.deals} icon={TrendingUp} accent="#9370DB" />
        <StatsCard title="Favorites" value={stats.favorites} icon={Sparkles} accent="#FFB6C1" className="animate-pulse-glow-pink" />
        <StatsCard title="Boards" value={stats.boards} icon={Users} accent="#10B981" />
      </div>

      {/* Search */}
      <DashboardSearch items={items} onResults={setSearchResults} />

      {/* Trend Charts */}
      {items.length > 0 && <TrendCharts items={items} />}

      {/* Recent / Ranked Saves */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {searchResults !== null ? "Search Results" : "Top Picks"}
            </h2>
            {searchResults === null && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> AI Ranked
              </span>
            )}
          </div>
          <Link to={createPageUrl("Saves")} className="text-xs text-[#00BFFF] hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {displayItems.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card rounded-2xl p-12 text-center">
            <div className="flex justify-center mb-4">
              <ClipForgeLogo size={56} variant="loading" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Your vault is empty</h3>
            <p className="text-[#8B8D97] text-sm mb-4">Start saving content from the web, social media, or add items manually.</p>
            <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Your First Save
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayItems.map((item) => (
              <SavedItemCard
                key={item.id}
                item={item}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
                isPro={isPro}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sharing Modes + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SharingModePanel />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to={createPageUrl("Search")} className="glass-card rounded-2xl p-4 hover:border-[#00BFFF]/30 transition-all group">
            <Sparkles className="w-7 h-7 text-[#00BFFF] mb-2 group-hover:animate-pulse" />
            <h3 className="font-semibold text-sm mb-0.5">AI Search</h3>
            <p className="text-xs text-[#8B8D97]">Natural language</p>
          </Link>
          <Link to={createPageUrl("Boards")} className="glass-card rounded-2xl p-4 hover:border-[#9370DB]/30 transition-all group">
            <Users className="w-7 h-7 text-[#9370DB] mb-2" />
            <h3 className="font-semibold text-sm mb-0.5">Shared Boards</h3>
            <p className="text-xs text-[#8B8D97]">Collaborate</p>
          </Link>
          <Link to={createPageUrl("Events")} className="glass-card rounded-2xl p-4 hover:border-[#9370DB]/30 transition-all group">
            <Calendar className="w-7 h-7 text-[#9370DB] mb-2" />
            <h3 className="font-semibold text-sm mb-0.5">Events</h3>
            <p className="text-xs text-[#8B8D97]">AI event reviews</p>
          </Link>
          <Link to={createPageUrl("ShoppingLists")} className="glass-card rounded-2xl p-4 hover:border-[#FFB6C1]/30 transition-all group">
            <ShoppingCart className="w-7 h-7 text-[#FFB6C1] mb-2" />
            <h3 className="font-semibold text-sm mb-0.5">Shopping</h3>
            <p className="text-xs text-[#8B8D97]">From recipes</p>
          </Link>
          <Link to={createPageUrl("Friends")} className="glass-card rounded-2xl p-4 hover:border-[#00BFFF]/30 transition-all group">
            <UserPlus className="w-7 h-7 text-[#00BFFF] mb-2" />
            <h3 className="font-semibold text-sm mb-0.5">Friends</h3>
            <p className="text-xs text-[#8B8D97]">Connect & share</p>
          </Link>
        </div>
      </div>

      {/* Family Premium banner for existing family members */}
      {isFamily && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-[#9370DB]/30 animate-gradient-shift"
          style={{ background: "linear-gradient(135deg, rgba(147,112,219,0.08), rgba(255,182,193,0.06))", backgroundSize: "200% 200%" }}>
          <ClipForgeLogo size={24} variant="default" />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ background: "linear-gradient(135deg,#9370DB,#FFB6C1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Family Premium Active
            </p>
            <p className="text-xs text-[#8B8D97]">Shared boards · child-safe modes · family sharing enabled</p>
          </div>
          <Link to={createPageUrl("Friends")} className="text-xs text-[#9370DB] hover:underline flex items-center gap-1">
            Manage <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Upgrade banner */}
      {user && !isPro && (
        <Link
          to={createPageUrl("Pricing")}
          className="block rounded-2xl p-5 neon-border hover:border-[#00BFFF]/60 transition-all animate-gradient-shift"
          style={{ background: "linear-gradient(135deg, rgba(0,191,255,0.08), rgba(147,112,219,0.12), rgba(255,182,193,0.06))", backgroundSize: "200% 200%" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ClipForgeLogo size={28} variant="default" />
              <div>
                <p className="text-sm font-black uppercase tracking-wide gradient-text">Unlock ClipForge Pro</p>
                <p className="text-xs text-[#8B8D97]">Unlimited saves · AI research · No ads — from $7.99/mo</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#00BFFF] flex-shrink-0" />
          </div>
        </Link>
      )}

      <AddItemDialog open={addOpen} onOpenChange={setAddOpen} onSave={handleSave} />
    </div>
    </div>
  );
}