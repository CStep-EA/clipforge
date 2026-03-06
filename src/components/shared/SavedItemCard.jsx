import React, { useState, useCallback } from "react";
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
  Gift,
  Globe,
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

/**
 * getFaviconUrl — returns a Google Favicon CDN URL for the given page URL.
 * Falls back to null if the URL can't be parsed.
 */
function getFaviconUrl(pageUrl) {
  if (!pageUrl) return null;
  try {
    const { hostname } = new URL(pageUrl);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return null;
  }
}

/**
 * extractDomain — returns just the bare domain (e.g. "reddit.com") for display.
 */
function extractDomain(pageUrl) {
  if (!pageUrl) return null;
  try {
    return new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// ── Favicon image with graceful fallback ──────────────────────────────────────
function FaviconImg({ url, className }) {
  const [failed, setFailed] = useState(false);
  const faviconUrl = getFaviconUrl(url);
  if (!faviconUrl || failed) {
    return <Globe className={cn("text-[#8B8D97]", className)} />;
  }
  return (
    <img
      src={faviconUrl}
      alt=""
      aria-hidden="true"
      onError={() => setFailed(true)}
      className={cn("rounded-sm object-contain", className)}
    />
  );
}

/**
 * fetchOgImagePassive — lightweight OG image fetcher for cards that loaded
 * without a thumbnail.  Uses the allorigins proxy; silently fails.
 */
async function fetchOgImagePassive(url) {
  if (!url) return null;
  try {
    new URL(url);
    const resp = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!resp.ok) return null;
    const { contents } = await resp.json();
    if (!contents) return null;
    const m =
      contents.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      contents.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      contents.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (!m) return null;
    return new URL(m[1], url).href;
  } catch { return null; }
}

export default function SavedItemCard({ item, onToggleFavorite, onDelete, onEdit, onShare, onItemUpdated, isPro = false }) {
  const [showResearch, setShowResearch] = useState(false);
  const [localItem, setLocalItem] = useState(item);
  const cat = categoryConfig[localItem.category] || categoryConfig.other;
  const domain = extractDomain(localItem.url);

  // Sync if parent changes the item
  React.useEffect(() => { setLocalItem(item); }, [item]);

  // Lazy OG-image fetch: if item has a URL but no image_url, try to grab one
  React.useEffect(() => {
    if (localItem.url && !localItem.image_url) {
      let cancelled = false;
      fetchOgImagePassive(localItem.url).then((imgUrl) => {
        if (!cancelled && imgUrl) {
          setLocalItem(prev => ({ ...prev, image_url: imgUrl }));
        }
      });
      return () => { cancelled = true; };
    }
  }, [localItem.url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open URL in new tab (used by card click — stops propagation from action buttons)
  const openUrl = useCallback((e) => {
    if (!localItem.url) return;
    // Don't navigate if clicking on an interactive child
    if (e.target.closest("button, a, [role='button'], input, select, textarea")) return;
    window.open(localItem.url, "_blank", "noopener,noreferrer");
  }, [localItem.url]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      whileHover={{ y: -3 }}
      layout
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      <Card
        className={cn(
          "saved-item-card glass-card overflow-hidden group hover:border-[#00BFFF]/40",
          "hover:shadow-[0_0_28px_rgba(0,191,255,0.18),0_0_8px_rgba(147,112,219,0.1)]",
          "transition-all duration-300 relative",
          localItem.url && "cursor-pointer",
          `category-${localItem.category}`
        )}
        onClick={localItem.url ? openUrl : undefined}
        // Keyboard accessibility: open link on Enter if card has URL
        onKeyDown={localItem.url ? (e) => {
          if (e.key === "Enter" && !e.target.closest("button, a, [role='button']")) openUrl(e);
        } : undefined}
        tabIndex={localItem.url ? 0 : undefined}
        role={localItem.url ? "link" : undefined}
        aria-label={localItem.url ? `Open ${localItem.title}` : undefined}
      >
        {/* shimmer overlay on hover */}
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shimmer-bg z-0" />

        {/* ── Hero image (OG/thumbnail) ──────────────────────────────── */}
        {localItem.image_url ? (
          <div className="relative h-40 overflow-hidden">
            <img
              src={localItem.image_url}
              alt={localItem.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1117] via-transparent to-transparent" />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <Badge variant="outline" className={cn("text-[10px] backdrop-blur-md", cat.color)}>
                {cat.label}
              </Badge>
            </div>
            {localItem.source && (
              <span className="absolute top-2 left-2 text-lg">{sourceIcons[localItem.source]}</span>
            )}
            {/* Favicon + domain overlay bottom-left */}
            {domain && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
                <FaviconImg url={localItem.url} className="w-3 h-3" />
                <span className="text-[9px] text-white/70 leading-none">{domain}</span>
              </div>
            )}
          </div>
        ) : (
          /* ── No image: show favicon + domain banner ──────────────── */
          localItem.url && (
            <div className="h-12 bg-gradient-to-r from-[#1A1D27] to-[#0F1117] border-b border-[#2A2D3A] flex items-center px-4 gap-2 overflow-hidden">
              <FaviconImg url={localItem.url} className="w-5 h-5 shrink-0" />
              {domain && (
                <span className="text-[11px] text-[#8B8D97] truncate">{domain}</span>
              )}
              <div className="ml-auto flex-shrink-0">
                <Badge variant="outline" className={cn("text-[9px]", cat.color)}>
                  {localItem.source && <span className="mr-1">{sourceIcons[localItem.source]}</span>}
                  {cat.label}
                </Badge>
              </div>
            </div>
          )
        )}

        <div className="p-4 space-y-3">
          {/* Category badge when no image AND no URL (no banner shown above) */}
          {!localItem.image_url && !localItem.url && (
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={cn("text-[10px]", cat.color)}>
                {localItem.source && <span className="mr-1">{sourceIcons[localItem.source]}</span>}
                {cat.label}
              </Badge>
              {localItem.rating && (
                <div className="flex items-center gap-1 text-xs text-amber-400">
                  <Star className="w-3 h-3 fill-current" />
                  {localItem.rating}/10
                </div>
              )}
            </div>
          )}
          {/* Rating row when image exists */}
          {localItem.image_url && localItem.rating && (
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <Star className="w-3 h-3 fill-current" />
              {localItem.rating}/10
            </div>
          )}

          {/* ── Title — clickable link if URL exists ──────────────── */}
          <h3 className="font-black text-[#E8E8ED] text-sm leading-tight line-clamp-2 group-hover:text-[#00BFFF] transition-colors">
            {localItem.is_favorite && <span className="mr-1 text-[#FFB6C1] animate-pulse-glow-pink inline-block">♥</span>}
            {localItem.url ? (
              <a
                href={localItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline focus:outline-none focus-visible:underline"
                // Don't bubble up to the card's own onClick
                onClick={(e) => e.stopPropagation()}
                aria-label={`Open ${localItem.title} in new tab`}
              >
                {localItem.title}
              </a>
            ) : (
              localItem.title
            )}
          </h3>

          {localItem.ai_summary && (
            <p className="text-xs text-[#8B8D97] line-clamp-2">{localItem.ai_summary}</p>
          )}

          {localItem.price != null && (
            <span className="inline-block text-sm font-bold text-[#00BFFF]">${localItem.price.toFixed(2)}</span>
          )}

          {localItem.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {localItem.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#2A2D3A] text-[#8B8D97]">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {localItem.reminder_date && (
            <div className="flex items-center gap-1 text-[10px] text-[#9370DB]">
              <Clock className="w-3 h-3" />
              Reminder set
            </div>
          )}

          {/* Event date display + calendar add */}
          {localItem.category === "event" && (localItem.event_date || localItem.reminder_enabled) && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#9370DB]/5 border border-[#9370DB]/20">
              <div className="text-[10px] text-[#9370DB] flex items-center gap-1">
                <span>📅</span>
                {localItem.event_date
                  ? new Date(localItem.event_date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
                  : "Event"}
                {localItem.event_venue && <span className="text-[#8B8D97] ml-1">· {localItem.event_venue}</span>}
              </div>
              {localItem.reminder_enabled && (
                <span className="text-[9px] text-[#00BFFF] flex items-center gap-0.5">🔔 On</span>
              )}
              {localItem.ticket_purchased && (
                <span className="text-[9px] text-emerald-400">🎟 Purchased</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-[#2A2D3A]">
            <div className="flex gap-1 flex-wrap items-center">
              <RecipeExportButton item={localItem} />
              {localItem.category === "event" && (
                <AddToCalendarButton
                  event={localItem}
                  entity="SavedItem"
                  size="sm"
                  onEventUpdated={(updated) => {
                    setLocalItem(updated);
                    onItemUpdated?.(updated);
                  }}
                />
              )}
              <motion.div whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.85 }}>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 text-[#8B8D97] hover:text-[#FFB6C1] hover:bg-[#FFB6C1]/10"
                onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(localItem); }}
                aria-label={localItem.is_favorite ? "Remove from favourites" : "Add to favourites"}
                aria-pressed={localItem.is_favorite}
              >
                <Heart className={cn("w-3.5 h-3.5", localItem.is_favorite && "fill-[#FFB6C1] text-[#FFB6C1] animate-pulse-glow-pink")} />
              </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.25, rotate: -8 }} whileTap={{ scale: 0.9 }}>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 text-[#8B8D97] hover:text-[#9370DB] hover:bg-[#9370DB]/10"
                onClick={(e) => { e.stopPropagation(); onShare?.(localItem); }}
                aria-label="Share this save"
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
              </motion.div>
              {localItem.category === "gift_idea" && (
                <span title="Gift Idea" className="text-[#EC4899] px-1">
                  <Gift className="w-3.5 h-3.5" />
                </span>
              )}
              {/* External link button — explicit "open in new tab" affordance */}
              {localItem.url && (
                <a
                  href={localItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open link in a new tab"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 text-[#8B8D97] hover:text-[#00BFFF]"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
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
                onClick={(e) => { e.stopPropagation(); setShowResearch(v => !v); }}
                aria-expanded={String(showResearch)}
                aria-label={showResearch ? "Hide AI research panel" : "Show AI research panel"}
              >
                AI
                {showResearch ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 text-[#8B8D97]"
                    aria-label="More options"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent style={{background:'var(--cf-surface)',borderColor:'var(--cf-border)',color:'var(--cf-text)'}}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(localItem); }} className="text-xs hover:bg-[#2A2D3A]">
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete?.(localItem); }} className="text-xs text-red-400 hover:bg-[#2A2D3A]">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {showResearch && (
            <>
              <AiSummaryButton item={localItem} isPro={isPro} />
              <DeepResearchPanel item={localItem} isPro={isPro} />
            </>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
