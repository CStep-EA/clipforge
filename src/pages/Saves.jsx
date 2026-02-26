import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, SlidersHorizontal, LayoutGrid, List, Share2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import SavedItemCard from "@/components/shared/SavedItemCard";
import CategoryFilter from "@/components/shared/CategoryFilter";
import AddItemDialog from "@/components/shared/AddItemDialog";
import ShareModal from "@/components/friends/ShareModal";
import { useSubscription } from "@/components/shared/useSubscription";

export default function Saves() {
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareItem, setShareItem] = useState(null);
  const { user, isPro, plan } = useSubscription();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("-created_date");
  const [viewMode, setViewMode] = useState("grid");

  const queryClient = useQueryClient();
  const { isPro } = useSubscription();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["savedItems"],
    queryFn: () => base44.entities.SavedItem.list("-created_date"),
  });

  const filtered = items
    .filter(i => activeCategory === "all" || i.category === activeCategory)
    .filter(i => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        i.title?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.tags?.some(t => t.toLowerCase().includes(q)) ||
        i.ai_summary?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "-created_date") return new Date(b.created_date) - new Date(a.created_date);
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "price") return (a.price || 999) - (b.price || 999);
      return 0;
    });

  const handleSave = async (formData) => {
    if (editItem) {
      await base44.entities.SavedItem.update(editItem.id, formData);
    } else {
      await base44.entities.SavedItem.create(formData);
    }
    setEditItem(null);
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

  const handleEdit = (item) => {
    setEditItem(item);
    setAddOpen(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Saves</h1>
          <p className="text-[#8B8D97] text-sm">{items.length} items in your vault</p>
        </div>
        <Button
          onClick={() => { setEditItem(null); setAddOpen(true); }}
          className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-2"
        >
          <Plus className="w-4 h-4" /> Add Save
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8D97]" />
            <Input
              placeholder="Search your saves..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] placeholder:text-[#8B8D97]/50"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
              <SlidersHorizontal className="w-3 h-3 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
              <SelectItem value="-created_date" className="text-[#E8E8ED]">Newest</SelectItem>
              <SelectItem value="rating" className="text-[#E8E8ED]">Top Rated</SelectItem>
              <SelectItem value="price" className="text-[#E8E8ED]">Lowest Price</SelectItem>
            </SelectContent>
          </Select>
          <div className="hidden md:flex border border-[#2A2D3A] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-[#00BFFF]/10 text-[#00BFFF]" : "text-[#8B8D97]"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${viewMode === "list" ? "bg-[#00BFFF]/10 text-[#00BFFF]" : "text-[#8B8D97]"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <CategoryFilter active={activeCategory} onChange={setActiveCategory} />
      </div>

      {/* Items grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="glass-card rounded-2xl h-56 shimmer-bg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#8B8D97]">No items found</p>
        </div>
      ) : (
        <div className={
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-3"
        }>
          <AnimatePresence>
            {filtered.map((item) => (
              <SavedItemCard
                key={item.id}
                item={item}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
                onEdit={handleEdit}
                isPro={isPro}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AddItemDialog
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) setEditItem(null); }}
        onSave={handleSave}
        editItem={editItem}
      />
    </div>
  );
}