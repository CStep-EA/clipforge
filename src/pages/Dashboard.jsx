import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Bookmark, TrendingUp, ShoppingCart, Users,
  Plus, ArrowRight, Sparkles, Zap, Calendar
} from "lucide-react";
import ClipForgeLogo from "@/components/shared/ClipForgeLogo";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import StatsCard from "@/components/shared/StatsCard";
import SavedItemCard from "@/components/shared/SavedItemCard";
import AddItemDialog from "@/components/shared/AddItemDialog";
import { useSubscription } from "@/components/shared/useSubscription";

export default function Dashboard() {
  const [addOpen, setAddOpen] = useState(false);
  const { user, isPro } = useSubscription();

  const { data: items = [], refetch } = useQuery({
    queryKey: ["savedItems"],
    queryFn: () => base44.entities.SavedItem.list("-created_date", 20),
  });

  const { data: boards = [] } = useQuery({
    queryKey: ["boards"],
    queryFn: () => base44.entities.SharedBoard.list("-created_date", 5),
  });

  const handleSave = async (formData) => {
    await base44.entities.SavedItem.create(formData);
    refetch();
  };

  const handleToggleFavorite = async (item) => {
    await base44.entities.SavedItem.update(item.id, { is_favorite: !item.is_favorite });
    refetch();
  };

  const handleDelete = async (item) => {
    await base44.entities.SavedItem.delete(item.id);
    refetch();
  };

  const stats = {
    total: items.length,
    deals: items.filter(i => i.category === "deal").length,
    favorites: items.filter(i => i.is_favorite).length,
    boards: boards.length,
  };

  const recentItems = items.slice(0, 6);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ClipForgeLogo size={32} variant="loading" />
            <h1 className="text-2xl md:text-3xl font-black tracking-tight gradient-text">
              ClipForge
            </h1>
          </div>
          <p className="text-[#8B8D97] text-sm">
            Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
            <span className="inline-block ml-2 animate-float">✨</span>
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-2 btn-glow animate-gradient-shift font-bold text-sm uppercase tracking-wide"
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

      {/* Recent Saves */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Saves</h2>
          <Link
            to={createPageUrl("Saves")}
            className="text-xs text-[#00BFFF] hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-2xl p-12 text-center"
          >
            <div className="flex justify-center mb-4">
              <ClipForgeLogo size={56} variant="loading" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Your vault is empty</h3>
            <p className="text-[#8B8D97] text-sm mb-4">Start saving content from the web, social media, or add items manually.</p>
            <Button
              onClick={() => setAddOpen(true)}
              className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Your First Save
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentItems.map((item) => (
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to={createPageUrl("Search")} className="glass-card rounded-2xl p-4 hover:border-[#00BFFF]/30 transition-all group">
          <Sparkles className="w-7 h-7 text-[#00BFFF] mb-2 group-hover:animate-pulse" />
          <h3 className="font-semibold text-sm mb-0.5">AI Search</h3>
          <p className="text-xs text-[#8B8D97]">Natural language search</p>
        </Link>
        <Link to={createPageUrl("Boards")} className="glass-card rounded-2xl p-4 hover:border-[#9370DB]/30 transition-all group">
          <Users className="w-7 h-7 text-[#9370DB] mb-2" />
          <h3 className="font-semibold text-sm mb-0.5">Shared Boards</h3>
          <p className="text-xs text-[#8B8D97]">Collaborate & share</p>
        </Link>
        <Link to={createPageUrl("Events")} className="glass-card rounded-2xl p-4 hover:border-[#9370DB]/30 transition-all group">
          <Calendar className="w-7 h-7 text-[#9370DB] mb-2" />
          <h3 className="font-semibold text-sm mb-0.5">Events</h3>
          <p className="text-xs text-[#8B8D97]">AI event reviews</p>
        </Link>
        <Link to={createPageUrl("ShoppingLists")} className="glass-card rounded-2xl p-4 hover:border-[#FFB6C1]/30 transition-all group">
          <ShoppingCart className="w-7 h-7 text-[#FFB6C1] mb-2" />
          <h3 className="font-semibold text-sm mb-0.5">Shopping</h3>
          <p className="text-xs text-[#8B8D97]">From recipe saves</p>
        </Link>
      </div>

      {/* Upgrade banner */}
      {user && (
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
  );
}