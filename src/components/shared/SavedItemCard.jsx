import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  ExternalLink,
  Share2,
  Star,
  Clock,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Gift
} from "lucide-react";
import RecipeExportButton from "@/components/dashboard/RecipeExportButton";
import AddToCalendarButton from "@/components/events/AddToCalendarButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import DeepResearchPanel from "./DeepResearchPanel";
import AiSummaryButton from "@/components/saves/AiSummaryButton";

const categoryConfig = {
  deal: { label: "Deal", color: "bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/30" },
  recipe: { label: "Recipe", color: "bg-[#FFB6C1]/15 text-[#FFB6C1] border-[#FFB6C1]/30" },
  event: { label: "Event", color: "bg-[#9370DB]/15 text-[#9370DB] border-[#9370DB]/30" },
  product: { label: "Product", color: "bg-amber-400/15 text-amber-400 border-amber-400/30" },
  article: { label: "Article", color: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30" },
  travel: { label: "Travel", color: "bg-blue-400/15 text-blue-400 border-blue-400/30" },
  gift_idea: { label: "Gift Idea", color: "bg-pink-400/15 text-pink-400 border-pink-400/30" },
  other: { label: "Other", color: "bg-gray-400/15 text-gray-400 border-gray-400/30" },
};

const sourceIcons = {
  instagram: "📸",
  pinterest: "📌",
  twitter: "🐦",
  tiktok: "🎵",
  manual: "✏️",
  web: "🌐",
};

export default function SavedItemCard({ item, onToggleFavorite, onDelete, onEdit, onShare, onItemUpdated, isPro = false }) {
  const [showResearch, setShowResearch] = useState(false);
  const [localItem, setLocalItem] = useState(item);
  const cat = categoryConfig[localItem.category] || categoryConfig.other;

  // Sync if parent changes the item
  React.useEffect(() => { setLocalItem(item); }, [item]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      whileHover={{ y: -3 }}
      layout
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      <Card className={cn(
        "glass-card overflow-hidden group hover:border-[#00BFFF]/40 hover:shadow-[0_0_28px_rgba(0,191,255,0.18),0_0_8px_rgba(147,112,219,0.1)] transition-all duration-300 relative",
        `category-${item.category}`
      )}>
        {/* shimmer overlay on hover */}
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shimmer-bg z-0" />
        {item.image_url && (
          <div className="relative h-40 overflow-hidden">
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1117] via-transparent to-transparent" />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <Badge variant="outline" className={cn("text-[10px] backdrop-blur-md", cat.color)}>
                {cat.label}
              </Badge>
            </div>
            {item.source && (
              <span className="absolute top-2 left-2 text-lg">{sourceIcons[item.source]}</span>
            )}
          </div>
        )}

        <div className="p-4 space-y-3">
          {!item.image_url && (
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={cn("text-[10px]", cat.color)}>
                {item.source && <span className="mr-1">{sourceIcons[item.source]}</span>}
                {cat.label}
              </Badge>
              {item.rating && (
                <div className="flex items-center gap-1 text-xs text-amber-400">
                  <Star className="w-3 h-3 fill-current" />
                  {item.rating}/10
                </div>
              )}
            </div>
          )}

          <h3 className="font-black text-[#E8E8ED] text-sm leading-tight line-clamp-2 group-hover:text-[#00BFFF] transition-colors">
            {item.is_favorite && <span className="mr-1 text-[#FFB6C1] animate-pulse-glow-pink inline-block">♥</span>}
            {item.title}
          </h3>

          {item.ai_summary && (
            <p className="text-xs text-[#8B8D97] line-clamp-2">{item.ai_summary}</p>
          )}

          {item.price != null && (
            <span className="inline-block text-sm font-bold text-[#00BFFF]">${item.price.toFixed(2)}</span>
          )}

          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#2A2D3A] text-[#8B8D97]">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {item.reminder_date && (
            <div className="flex items-center gap-1 text-[10px] text-[#9370DB]">
              <Clock className="w-3 h-3" />
              Reminder set
            </div>
          )}

          {/* Event date display + calendar add */}
          {item.category === "event" && item.event_date && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#9370DB]/5 border border-[#9370DB]/20">
              <div className="text-[10px] text-[#9370DB] flex items-center gap-1">
                <span>📅</span>
                {new Date(item.event_date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                {item.event_venue && <span className="text-[#8B8D97] ml-1">· {item.event_venue}</span>}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-[#2A2D3A]">
            <div className="flex gap-1 flex-wrap items-center">
              <RecipeExportButton item={item} />
              {item.category === "event" && (
                <AddToCalendarButton event={item} entity="SavedItem" size="sm" />
              )}
              <motion.div whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.85 }}>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-[#8B8D97] hover:text-[#FFB6C1] hover:bg-[#FFB6C1]/10"
                onClick={() => onToggleFavorite?.(item)}
              >
                <Heart className={cn("w-3.5 h-3.5", item.is_favorite && "fill-[#FFB6C1] text-[#FFB6C1] animate-pulse-glow-pink")} />
              </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.25, rotate: -8 }} whileTap={{ scale: 0.9 }}>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-[#8B8D97] hover:text-[#9370DB] hover:bg-[#9370DB]/10"
                onClick={() => onShare?.(item)}
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
              </motion.div>
              {item.category === "gift_idea" && (
                <span title="Gift Idea" className="text-[#EC4899] px-1">
                  <Gift className="w-3.5 h-3.5" />
                </span>
              )}
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-[#8B8D97] hover:text-[#00BFFF]">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] text-[#9370DB] hover:bg-[#9370DB]/10 gap-1 px-2"
                onClick={() => setShowResearch(v => !v)}
              >
                AI
                {showResearch ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-[#8B8D97]">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
                  <DropdownMenuItem onClick={() => onEdit?.(item)} className="text-xs hover:bg-[#2A2D3A]">
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(item)} className="text-xs text-red-400 hover:bg-[#2A2D3A]">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {showResearch && (
            <>
              <AiSummaryButton item={item} isPro={isPro} />
              <DeepResearchPanel item={item} isPro={isPro} />
            </>
          )}
        </div>
      </Card>
    </motion.div>
  );
}