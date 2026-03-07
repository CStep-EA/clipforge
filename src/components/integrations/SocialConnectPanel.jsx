import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent, DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2, Link2, RefreshCw, Loader2, AlertCircle,
  WifiOff, Clock, MapPin, Calendar, Ticket, ExternalLink,
  Lock, Shield, Info, Filter, Sliders, Upload, Download,
  FolderOpen, CheckSquare, X,
} from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import ConsentModal from "./ConsentModal";
import { useSubscription } from "@/components/shared/useSubscription";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Platform definitions ────────────────────────────────────────────────────
// Each entry describes what the platform *can* do via real OAuth.
// `syncSupport` = true means we can call a real API endpoint after OAuth.
// Platforms without server-side API support show an honest "manual import" UI.
const PLATFORMS = [
  {
    id: "instagram",
    name: "Instagram",
    emoji: "📸",
    color: "#E1306C",
    description: "Sync saved posts & collections",
    note: "Connect via Instagram Graph API. Syncs your Saved posts (requires Business/Creator account for full access).",
    categoryHint: "deals, products, travel, gift ideas",
    categoryFocus: ["deal", "product", "travel", "gift_idea"],
    syncSupport: true,
    syncNote: "Syncs posts you've saved on Instagram. Requires a Business or Creator account connected to a Facebook Page for full Saved posts access.",
  },
  {
    id: "facebook",
    name: "Facebook",
    emoji: "👤",
    color: "#1877F2",
    description: "Import saved posts & marketplace finds",
    // ⚠️ Facebook's Graph API does NOT expose the user's personal Saved posts
    // endpoint to third-party apps (/me/saved is deprecated / restricted).
    // We use the Pages + share flow instead, and guide users to manual export.
    note: "Facebook restricts third-party access to personal Saved posts. After connecting, you can manually paste post URLs or use the browser extension to save from Facebook.",
    categoryHint: "deals, events, gift ideas, articles",
    categoryFocus: ["deal", "event", "gift_idea", "article"],
    syncSupport: false,                 // <-- honest: no automatic sync possible
    syncNote: "Facebook's API no longer allows apps to read personal Saved posts (deprecated in 2018). You can still save individual posts using the Klip4ge browser extension while browsing Facebook.",
    apiLimitation: true,
  },
  {
    id: "pinterest",
    name: "Pinterest",
    emoji: "📌",
    color: "#E60023",
    description: "Import boards & saved pins",
    note: "Connect with Pinterest OAuth. Syncs your boards and saved pins automatically.",
    categoryHint: "recipes, travel, gift ideas, articles",
    categoryFocus: ["recipe", "travel", "gift_idea", "article"],
    syncSupport: true,
    syncNote: "Syncs your Pinterest boards and all pins within them.",
  },
  {
    id: "twitter",
    name: "X / Twitter",
    emoji: "𝕏",
    color: "#1A1A1A",
    description: "Import bookmarks & saved tweets",
    note: "Connect via X OAuth 2.0. Syncs your Bookmarks (requires Basic API tier or above).",
    categoryHint: "deals, articles, events",
    categoryFocus: ["deal", "article", "event"],
    syncSupport: true,
    syncNote: "Syncs your X/Twitter Bookmarks. Note: X Basic API access is required — free tier has limited bookmark access.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    emoji: "🎵",
    color: "#69C9D0",
    description: "Sync favorited videos & collections",
    note: "Connect with TikTok OAuth. Syncs your Liked Videos and Collections.",
    categoryHint: "recipes, products, events",
    categoryFocus: ["recipe", "product", "event"],
    syncSupport: true,
    syncNote: "Syncs your TikTok liked videos and saved collections.",
  },
  {
    id: "web",
    name: "Etsy",
    emoji: "🛍️",
    color: "#F56400",
    description: "Save favorites & gift ideas from Etsy",
    note: "Connect with Etsy OAuth. Imports your favorited listings and shops.",
    categoryHint: "gift ideas, products",
    categoryFocus: ["gift_idea", "product"],
    syncSupport: true,
    syncNote: "Syncs your Etsy favorite listings directly into your Saves vault.",
  },
  {
    id: "manual",
    name: "Allrecipes",
    emoji: "🍽️",
    color: "#D62300",
    description: "Import saved recipes from Allrecipes",
    note: "Enter your Allrecipes username. We sync your Recipe Box via their public feed.",
    categoryHint: "recipes",
    categoryFocus: ["recipe"],
    syncSupport: false,
    syncNote: "Allrecipes doesn't provide a public API. Use the Klip4ge browser extension to save recipes as you browse, or paste recipe URLs manually.",
    apiLimitation: true,
  },
];

const COMING_SOON_PLATFORMS = [
  {
    id: "linkedin",
    name: "LinkedIn",
    emoji: "💼",
    color: "#0A66C2",
    description: "Import saved posts & articles",
    reason: "LinkedIn API has strict rate limits. We're working on a compliant integration.",
    categoryFocus: ["article", "other"],
  },
  {
    id: "truth_social",
    name: "Truth Social",
    emoji: "🦅",
    color: "#FF6A2C",
    description: "Sync saved posts & bookmarks",
    reason: "Official API access pending. Planned for Q3 2026.",
    categoryFocus: ["article", "event", "other"],
  },
];

// ─── Ticketmaster category/genre options ─────────────────────────────────────
const TM_CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "Music", label: "🎵 Music" },
  { value: "Sports", label: "🏆 Sports" },
  { value: "Arts & Theatre", label: "🎭 Arts & Theatre" },
  { value: "Film", label: "🎬 Film" },
  { value: "Miscellaneous", label: "🎉 Miscellaneous" },
  { value: "Family", label: "👨‍👩‍👧 Family" },
];

const TM_RADIUS_OPTIONS = [
  { value: "10", label: "Within 10 miles" },
  { value: "25", label: "Within 25 miles" },
  { value: "50", label: "Within 50 miles" },
  { value: "100", label: "Within 100 miles" },
  { value: "250", label: "Within 250 miles" },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function SocialConnectPanel() {
  const [connectDialog, setConnectDialog] = useState(null);
  const [consentPlatform, setConsentPlatform] = useState(null);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [syncResults, setSyncResults] = useState({});
  const [autoSyncToggles, setAutoSyncToggles] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cf_autosync") || "{}"); } catch { return {}; }
  });
  // Ticketmaster filters — local state, seeded from Market Savings prefs if set
  const marketPrefs = (() => {
    try { return JSON.parse(localStorage.getItem("cf_market_prefs") || "{}"); } catch { return {}; }
  })();
  const [tmLoading, setTmLoading] = useState(false);
  const [tmEvents, setTmEvents] = useState([]);
  const [tmCity, setTmCity] = useState(marketPrefs.city || "Denver");
  const [tmCategory, setTmCategory] = useState("");
  const [tmRadius, setTmRadius] = useState(marketPrefs.radius || "50");
  const [tmShowFilters, setTmShowFilters] = useState(false);
  const [tmSavedIds, setTmSavedIds] = useState(new Set());

  // ── Facebook JSON import state ──────────────────────────────────────────
  const [fbImportOpen, setFbImportOpen] = useState(false);
  const [fbImporting, setFbImporting] = useState(false);
  const [fbImportResult, setFbImportResult] = useState(null);
  const [fbPreview, setFbPreview] = useState(null); // parsed JSON preview
  const [fbCreateBoards, setFbCreateBoards] = useState(true);
  const fbFileRef = useRef(null);

  const handleFbFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const saves = parsed.saves || parsed; // support both {saves:[]} and raw []
      if (!Array.isArray(saves) || saves.length === 0) {
        toast.error("Invalid file — expected a JSON array of saves from the Klip4ge scraper.");
        return;
      }
      const collections = [...new Set(saves.map(s => s.collection).filter(Boolean))];
      setFbPreview({ saves, total: saves.length, collections, fileName: file.name });
    } catch {
      toast.error("Could not read file. Make sure it's the JSON exported by the Klip4ge Facebook scraper.");
    }
  };

  const handleFbImport = async () => {
    if (!fbPreview?.saves?.length) return;
    setFbImporting(true);
    setFbImportResult(null);
    try {
      const result = await base44.functions.invoke("importFacebookSaves", {
        saves: fbPreview.saves,
        createBoards: fbCreateBoards,
        overwrite: false,
      });
      setFbImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["savedItems"] });
      if (result.imported > 0) {
        toast.success(`✓ Imported ${result.imported} saves from Facebook!`);
      } else {
        toast.info("All items already in your vault.");
      }
    } catch (err) {
      toast.error("Import failed. Please try again.");
      console.error("[fbImport]", err);
    } finally {
      setFbImporting(false);
    }
  };

  const resetFbImport = () => {
    setFbPreview(null);
    setFbImportResult(null);
    if (fbFileRef.current) fbFileRef.current.value = "";
  };

  const queryClient = useQueryClient();
  const { isPremium: isPremiumPlan, isFamily } = useSubscription();
  const isPremiumUser = isPremiumPlan || isFamily;

  const toggleAutoSync = (platformId, value) => {
    if (!isPremiumUser) {
      toast.error("Auto-sync requires Premium or Family plan.");
      return;
    }
    const updated = { ...autoSyncToggles, [platformId]: value };
    setAutoSyncToggles(updated);
    localStorage.setItem("cf_autosync", JSON.stringify(updated));
    toast.success(value ? "Auto-sync enabled (daily)" : "Auto-sync disabled");
  };

  const { data: connections = [] } = useQuery({
    queryKey: ["socialConnections"],
    queryFn: () => base44.entities.SocialConnection.list(),
  });

  const getConnection = (platformId) =>
    connections.find((c) => c.platform === platformId);

  // ── Ticketmaster: search with real filters, manual save-to-vault ──────────
  const fetchTicketmasterEvents = async () => {
    if (!tmCity.trim()) {
      toast.error("Please enter a city name.");
      return;
    }
    setTmLoading(true);
    setTmEvents([]);
    try {
      const result = await base44.functions.invoke("ticketmaster", {
        city: tmCity.trim(),
        category: tmCategory || undefined,
        radius: tmRadius,
        size: 8,
      });
      const events = result?.data?.events || [];
      if (events.length === 0) {
        toast.info(`No events found near ${tmCity}${tmCategory ? ` in ${tmCategory}` : ""}. Try expanding your radius or changing the category.`);
      }
      setTmEvents(events.slice(0, 8));
    } catch (err) {
      toast.error("Couldn't load events. Check your connection and try again.");
      console.error("[Ticketmaster]", err);
    } finally {
      setTmLoading(false);
    }
  };

  // Only save to vault when user explicitly clicks "+ Save Event"
  const saveEvent = async (ev) => {
    try {
      await base44.entities.SavedItem.create({
        title: ev.name,
        description: ev.category ? `${ev.category} event` : "Live event",
        url: ev.ticketmaster_url || "",
        image_url: ev.image_url || "",
        category: "event",
        source: "web",
        tags: [ev.category, tmCity.trim()].filter(Boolean),
        ai_summary: `Live event at ${ev.venue || "venue TBD"}${ev.date ? ` on ${ev.date}` : ""}. ${ev.min_price ? `From $${ev.min_price}.` : ""}`,
        rating: null,
        price: ev.min_price || null,
        event_date: ev.date || null,
        event_venue: ev.venue || null,
      });
      setTmSavedIds(prev => new Set([...prev, ev.ticketmaster_id || ev.name]));
      queryClient.invalidateQueries({ queryKey: ["savedItems"] });
      toast.success(`"${ev.name}" saved to your vault!`);
    } catch (err) {
      toast.error("Couldn't save event. Try again.");
      console.error("[saveEvent]", err);
    }
  };

  // ── OAuth connect ─────────────────────────────────────────────────────────
  const handleOAuthConnect = async (platform) => {
    setOauthLoading(platform.id);
    setConnectDialog(null);
    try {
      await base44.auth.redirectToLogin({ provider: platform.id });

      const existing = getConnection(platform.id);
      if (existing) {
        await base44.entities.SocialConnection.update(existing.id, { connected: true });
      } else {
        await base44.entities.SocialConnection.create({
          platform: platform.id,
          connected: true,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["socialConnections"] });
      toast.success(`${platform.name} connected!`);
    } catch {
      toast.error(`Couldn't connect ${platform.name}. Please try again.`);
    } finally {
      setOauthLoading(null);
    }
  };

  // ── Real sync: calls server-side function that uses the stored OAuth token ─
  // For platforms where syncSupport=false, we show the honest limitation instead.
  const handleSync = async (platform) => {
    if (!platform.syncSupport) {
      toast.info(`${platform.name} sync is not available — see the info below the card.`);
      return;
    }
    setSyncing(platform.id);
    const conn = getConnection(platform.id);
    try {
      // Call the real server-side sync function
      // The function uses the stored OAuth access token (never exposed to client)
      const result = await base44.functions.invoke("syncSocialPlatform", {
        platform: platform.id,
        connectionId: conn?.id,
        categoryFocus: platform.categoryFocus,
      });

      const newCount = result?.imported || 0;
      if (conn) {
        await base44.entities.SocialConnection.update(conn.id, {
          last_synced: new Date().toISOString(),
          sync_count: (conn.sync_count || 0) + newCount,
        });
      }
      setSyncResults(prev => ({
        ...prev,
        [platform.id]: { count: newCount, time: new Date() },
      }));
      queryClient.invalidateQueries({ queryKey: ["socialConnections"] });
      queryClient.invalidateQueries({ queryKey: ["savedItems"] });

      if (newCount > 0) {
        toast.success(`Synced ${newCount} new item${newCount !== 1 ? "s" : ""} from ${platform.name}!`);
      } else {
        toast.info(`${platform.name} is up to date — no new saves found.`);
      }
    } catch (err) {
      toast.error(`Sync failed for ${platform.name}. Your connection may need to be refreshed.`);
      console.error(`[handleSync:${platform.id}]`, err);
    } finally {
      setSyncing(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Social OAuth Platforms ─────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-[#E8E8ED] mb-3">Social Platforms</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORMS.map((platform, i) => {
            const conn = getConnection(platform.id);
            const isConnected = conn?.connected;
            const recentSync = syncResults[platform.id];
            return (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card
                  className="glass-card p-4 relative overflow-hidden flex flex-col"
                  style={{ borderColor: isConnected ? `${platform.color}50` : "" }}
                >
                  {isConnected && (
                    <div
                      className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
                      style={{ background: platform.color }}
                    />
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{platform.emoji}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-sm">{platform.name}</h3>
                          {isConnected
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            : <WifiOff className="w-3 h-3 text-[#8B8D97]" />
                          }
                        </div>
                        <p className="text-[10px] text-[#8B8D97]">{platform.description}</p>
                      </div>
                    </div>
                    {isConnected && (
                      <Badge className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 gap-1 shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                      </Badge>
                    )}
                  </div>

                  {/* API limitation warning — shown upfront */}
                  {platform.apiLimitation && (
                    <div className="mb-3 p-2 rounded-lg bg-amber-500/8 border border-amber-500/20 flex gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-300 leading-snug">{platform.syncNote}</p>
                    </div>
                  )}

                  {/* Connected metadata */}
                  {isConnected && (
                    <div className="mb-2 space-y-1">
                      <p className="text-[10px] text-[#8B8D97]">
                        {conn?.username && (
                          <><span style={{ color: platform.color }}>@{conn.username}</span> · </>
                        )}
                        {conn?.sync_count ? `${conn.sync_count} items synced` : "Ready to sync"}
                      </p>
                      {conn?.last_synced && (
                        <p className="text-xs text-[#8B8D97] flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Last sync: {new Date(conn.last_synced).toLocaleString("en", {
                            month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      )}
                      {recentSync && (
                        <p className="text-xs text-emerald-400">
                          ✓ +{recentSync.count} new item{recentSync.count !== 1 ? "s" : ""} synced
                        </p>
                      )}
                    </div>
                  )}

                  {/* Category focus chips */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {platform.categoryFocus?.map(c => (
                      <span key={c} className="text-xs px-1.5 py-0.5 rounded-full bg-[#2A2D3A] text-[#8B8D97] capitalize">
                        {c.replace("_", " ")}
                      </span>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-auto">
                    <Button
                      size="sm"
                      className={`flex-1 text-xs h-8 font-semibold gap-1.5 transition-all duration-200 ${!isConnected ? "animate-btn-pulse" : ""}`}
                      style={isConnected
                        ? { background: "transparent", border: `1px solid ${platform.color}60`, color: platform.color }
                        : { background: `linear-gradient(135deg, ${platform.color}, ${platform.color}cc)`, color: "white", boxShadow: `0 0 18px ${platform.color}55` }
                      }
                      onClick={() => {
                        if (platform.id === "facebook") {
                          setFbImportOpen(true); resetFbImport();
                        } else if (isConnected) {
                          setConnectDialog(platform);
                        } else {
                          setConsentPlatform(platform);
                        }
                      }}
                      disabled={oauthLoading === platform.id}
                    >
                      <Link2 className="w-3 h-3" />
                      {platform.id === "facebook"
                        ? "Import Saves"
                        : isConnected ? "Reconnect" : `Connect ${platform.name}`
                      }
                    </Button>

                    {isConnected && platform.syncSupport && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-[#2A2D3A] text-[#8B8D97] hover:text-[#00BFFF] hover:border-[#00BFFF]/40 gap-1.5 text-[10px]"
                        onClick={() => handleSync(platform)}
                        disabled={syncing === platform.id}
                        title={platform.syncNote}
                      >
                        {syncing === platform.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <RefreshCw className="w-3 h-3" />
                        }
                        {syncing === platform.id ? "Syncing…" : "Sync Now"}
                      </Button>
                    )}

                    {/* No-API platforms: Facebook → Import JSON; Allrecipes → extension tip */}
                    {!platform.syncSupport && platform.id === "facebook" && (
                      <Button
                        size="sm"
                        className="flex-1 h-8 gap-1.5 text-[10px] font-semibold"
                        style={{ background: "linear-gradient(135deg,#1877F2,#1877F2cc)", color: "white" }}
                        onClick={() => { setFbImportOpen(true); resetFbImport(); }}
                      >
                        <Upload className="w-3 h-3" /> Import from JSON
                      </Button>
                    )}
                    {!platform.syncSupport && platform.id !== "facebook" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-[#2A2D3A] text-[#8B8D97] hover:text-[#9370DB] hover:border-[#9370DB]/40 gap-1.5 text-[10px]"
                        onClick={() => toast.info("Use the browser extension to save posts directly from " + platform.name)}
                      >
                        <Info className="w-3 h-3" /> How to save
                      </Button>
                    )}
                  </div>

                  {/* Auto-sync toggle — Premium only, only for platforms with real sync */}
                  {isConnected && platform.syncSupport && (
                    <div className={`mt-3 flex items-center justify-between px-2 py-1.5 rounded-lg ${isPremiumUser ? "bg-[#1A1D27]" : "bg-[#1A1D27] opacity-60"}`}>
                      <div className="flex items-center gap-1.5">
                        {!isPremiumUser && <Lock className="w-3 h-3 text-[#8B8D97]" />}
                        <span className="text-[10px] text-[#8B8D97]">
                          Auto-sync {isPremiumUser ? "(daily)" : "— Premium"}
                        </span>
                      </div>
                      <Switch
                        checked={!!autoSyncToggles[platform.id]}
                        onCheckedChange={v => toggleAutoSync(platform.id, v)}
                        className="scale-75"
                      />
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Privacy note */}
        <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex gap-2">
          <Shield className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#8B8D97]">
            Klip4ge uses secure OAuth — your passwords are never shared. Access tokens are stored
            server-side only and used exclusively to import <em>your own</em> saved content.
            Sync only runs when you trigger it (or daily if Auto-sync is on).
          </p>
        </div>

        {/* Coming Soon */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-[#8B8D97] uppercase tracking-widest mb-3">Coming Soon</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMING_SOON_PLATFORMS.map(p => (
              <Card key={p.id} className="glass-card p-4 opacity-70">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.emoji}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-sm">{p.name}</h3>
                        <Badge variant="outline" className="text-xs border-[#F59E0B]/30 text-[#F59E0B]">
                          Coming Soon
                        </Badge>
                      </div>
                      <p className="text-[10px] text-[#8B8D97]">{p.description}</p>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-[#8B8D97] mb-3 italic">{p.reason}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.categoryFocus.map(c => (
                    <span key={c} className="text-xs px-1.5 py-0.5 rounded-full bg-[#2A2D3A] text-[#8B8D97] capitalize">
                      {c.replace("_", " ")}
                    </span>
                  ))}
                </div>
                <Link to={createPageUrl("Support") + "?tab=roadmap"}>
                  <Button size="sm" variant="outline" className="w-full border-[#2A2D3A] text-[#8B8D97] text-xs gap-1.5">
                    View Roadmap →
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* ── Ticketmaster Event Discovery ────────────────────────────────── */}
      {/* Only shown when Market Savings is enabled (or no pref saved yet — defaults open) */}
      {marketPrefs.enabled !== false && <div>
        <h3 className="text-sm font-semibold text-[#E8E8ED] mb-1 flex items-center gap-2">
          <Ticket className="w-4 h-4 text-[#00BFFF]" /> Event Discovery
          <Badge className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 gap-1 ml-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> Powered by Ticketmaster
          </Badge>
        </h3>

        {/* Opt-in notice — events are NOT auto-added to saves */}
        <div className="mb-3 p-2.5 rounded-xl bg-[#00BFFF]/5 border border-[#00BFFF]/15 flex gap-2">
          <Info className="w-3.5 h-3.5 text-[#00BFFF] shrink-0 mt-0.5" />
          <p className="text-[10px] text-[#8B8D97] leading-snug">
            Search for live events near you. Events are <strong className="text-[#E8E8ED]">only added to your Saves when you click "+ Save"</strong> — nothing is imported automatically.
          </p>
        </div>

        <Card className="glass-card p-4">
          {/* City + Search row */}
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="City (e.g. Denver, NYC)"
              value={tmCity}
              onChange={e => setTmCity(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchTicketmasterEvents()}
              className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] text-sm h-9"
            />
            <Button
              size="sm"
              className="bg-[#00BFFF] text-[#0F1117] font-bold h-9 px-4 shrink-0 gap-1.5"
              onClick={fetchTicketmasterEvents}
              disabled={tmLoading}
            >
              {tmLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <><Ticket className="w-3.5 h-3.5" /> Find Events</>
              }
            </Button>
          </div>

          {/* Filters toggle */}
          <button
            className="flex items-center gap-1.5 text-[10px] text-[#8B8D97] hover:text-[#00BFFF] mb-3 transition-colors"
            onClick={() => setTmShowFilters(v => !v)}
          >
            <Sliders className="w-3 h-3" />
            {tmShowFilters ? "Hide filters" : "Show filters (category & distance)"}
          </button>

          {tmShowFilters && (
            <div className="grid grid-cols-2 gap-2 mb-3 p-3 rounded-xl bg-[#1A1D27] border border-[#2A2D3A]">
              <div>
                <label className="text-[10px] text-[#8B8D97] block mb-1">Category</label>
                <Select value={tmCategory} onValueChange={setTmCategory}>
                  <SelectTrigger className="h-8 text-xs bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                    {TM_CATEGORIES.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs text-[#E8E8ED]">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-[#8B8D97] block mb-1">Distance</label>
                <Select value={tmRadius} onValueChange={setTmRadius}>
                  <SelectTrigger className="h-8 text-xs bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                    {TM_RADIUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs text-[#E8E8ED]">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Results */}
          {tmEvents.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tmEvents.map((ev, i) => {
                const evId = ev.ticketmaster_id || ev.name;
                const alreadySaved = tmSavedIds.has(evId);
                return (
                  <motion.div
                    key={evId + i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="rounded-xl overflow-hidden border border-[#2A2D3A] bg-[#0F1117] hover:border-[#00BFFF]/30 transition-colors">
                      {ev.image_url && (
                        <img
                          src={ev.image_url}
                          alt={ev.name}
                          className="w-full h-24 object-cover"
                          onError={e => { e.currentTarget.style.display = "none"; }}
                        />
                      )}
                      <div className="p-3">
                        <p className="text-xs font-semibold text-[#E8E8ED] line-clamp-1">{ev.name}</p>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-[#8B8D97]">
                          {ev.date && <><Calendar className="w-2.5 h-2.5" /> {ev.date}</>}
                          {ev.venue && <><MapPin className="w-2.5 h-2.5 ml-1.5" /> {ev.venue}</>}
                        </div>
                        {ev.min_price && (
                          <p className="text-[10px] text-emerald-400 mt-1">From ${ev.min_price}</p>
                        )}
                        <div className="flex gap-1.5 mt-2">
                          <Button
                            size="sm"
                            className={`flex-1 h-7 text-[10px] font-bold transition-all ${alreadySaved
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                              : "bg-[#00BFFF] text-[#0F1117]"
                            }`}
                            onClick={() => !alreadySaved && saveEvent(ev)}
                            disabled={alreadySaved}
                          >
                            {alreadySaved ? "✓ Saved" : "+ Save Event"}
                          </Button>
                          {ev.ticketmaster_url && (
                            <a href={ev.ticketmaster_url} target="_blank" rel="noopener noreferrer">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 border-[#2A2D3A] text-[#8B8D97] px-2"
                                title="View on Ticketmaster"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </div>}
      {/* Disabled market savings notice */}
      {marketPrefs.enabled === false && (
        <div className="p-3 rounded-xl bg-[#2A2D3A]/50 border border-[#2A2D3A] flex items-center gap-2">
          <Info className="w-4 h-4 text-[#8B8D97] shrink-0" />
          <p className="text-xs text-[#8B8D97]">
            Event Discovery is off. Enable <strong>Market Savings</strong> in{" "}
            <a href="/settings" className="text-[#00BFFF] hover:underline">Settings → Market Savings</a>{" "}
            to browse deals and events near you.
          </p>
        </div>
      )}

      {/* ── Facebook JSON Import Dialog ──────────────────────────────── */}
      <Dialog open={fbImportOpen} onOpenChange={(v) => { setFbImportOpen(v); if (!v) resetFbImport(); }}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">👤</span>
              <span>Import Facebook Saves</span>
            </DialogTitle>
            <DialogDescription className="text-[#8B8D97] text-xs leading-relaxed">
              Facebook's API no longer provides access to personal saves. Use the <strong className="text-[#E8E8ED]">Klip4ge Facebook Scraper</strong> tool on your computer to export your saves, then upload the JSON here.
            </DialogDescription>
          </DialogHeader>

          {!fbImportResult ? (
            <div className="space-y-4 pt-2">
              {/* Step 1 — Download scraper */}
              <div className="p-3 rounded-xl bg-[#1877F2]/8 border border-[#1877F2]/20">
                <p className="text-xs font-semibold text-[#1877F2] mb-2 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Step 1 — Get the Scraper Tool
                </p>
                <p className="text-[11px] text-[#8B8D97] mb-3 leading-snug">
                  Download and run the Klip4ge Facebook Scraper on your computer. It opens a browser window where you log in manually — your password is never stored or sent anywhere.
                </p>
                <div className="bg-[#0F1117] rounded-lg p-2.5 text-[10px] font-mono text-[#10B981] space-y-1">
                  <p># 1. Clone or download the scraper</p>
                  <p className="text-[#8B8D97]">git clone https://github.com/CStep-EA/clipforge</p>
                  <p>cd clipforge/tools/fb-saves-scraper</p>
                  <p></p>
                  <p># 2. Install &amp; run</p>
                  <p>npm install &amp;&amp; npm run setup</p>
                  <p>npm run scrape</p>
                  <p></p>
                  <p className="text-[#8B8D97]"># → exports facebook-saves.json</p>
                </div>
              </div>

              {/* Step 2 — Upload JSON */}
              <div className="p-3 rounded-xl bg-[#9370DB]/8 border border-[#9370DB]/20">
                <p className="text-xs font-semibold text-[#9370DB] mb-2 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Step 2 — Upload Your JSON
                </p>
                {!fbPreview ? (
                  <div
                    className="border-2 border-dashed border-[#2A2D3A] rounded-xl p-6 text-center cursor-pointer hover:border-[#9370DB]/40 transition-colors"
                    onClick={() => fbFileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { fbFileRef.current.files = e.dataTransfer.files; handleFbFileSelect({ target: fbFileRef.current }); } }}
                  >
                    <FolderOpen className="w-8 h-8 text-[#8B8D97] mx-auto mb-2" />
                    <p className="text-sm text-[#8B8D97]">Click to select <strong className="text-[#E8E8ED]">facebook-saves.json</strong></p>
                    <p className="text-[10px] text-[#8B8D97]/60 mt-1">or drag &amp; drop it here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Preview */}
                    <div className="bg-[#0F1117] rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#E8E8ED]">
                          📄 {fbPreview.fileName}
                        </p>
                        <button onClick={resetFbImport} className="text-[#8B8D97] hover:text-red-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-4 text-[11px] text-[#8B8D97]">
                        <span className="text-[#00BFFF] font-bold">{fbPreview.total}</span> saves
                        {fbPreview.collections.length > 0 && (
                          <span>{fbPreview.collections.length} collection{fbPreview.collections.length !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                      {fbPreview.collections.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {fbPreview.collections.slice(0, 6).map(c => (
                            <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#2A2D3A] text-[#8B8D97]">{c}</span>
                          ))}
                          {fbPreview.collections.length > 6 && (
                            <span className="text-[9px] text-[#8B8D97]">+{fbPreview.collections.length - 6} more</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Options */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#1A1D27]">
                      <div>
                        <p className="text-xs text-[#E8E8ED]">Create boards per collection</p>
                        <p className="text-[10px] text-[#8B8D97]">Adds a SharedBoard for each Facebook collection</p>
                      </div>
                      <Switch checked={fbCreateBoards} onCheckedChange={setFbCreateBoards} />
                    </div>
                  </div>
                )}

                <input
                  ref={fbFileRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFbFileSelect}
                />
              </div>

              {/* Import button */}
              {fbPreview && (
                <Button
                  onClick={handleFbImport}
                  disabled={fbImporting}
                  className="w-full h-11 font-semibold gap-2"
                  style={{ background: "linear-gradient(135deg,#1877F2,#9370DB)", color: "white" }}
                >
                  {fbImporting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing {fbPreview.total} saves…</>
                    : <><Upload className="w-4 h-4" /> Import {fbPreview.total} saves into Klip4ge</>
                  }
                </Button>
              )}
            </div>
          ) : (
            /* Results screen */
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-center">
                <CheckSquare className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-emerald-400 text-lg">{fbImportResult.imported} saves imported!</p>
                {fbImportResult.skipped > 0 && (
                  <p className="text-[11px] text-[#8B8D97] mt-1">{fbImportResult.skipped} already in vault (skipped)</p>
                )}
                {fbImportResult.boards_created > 0 && (
                  <p className="text-[11px] text-emerald-400/80 mt-1">✓ {fbImportResult.boards_created} collection board{fbImportResult.boards_created !== 1 ? "s" : ""} created</p>
                )}
              </div>
              {fbImportResult.errors?.length > 0 && (
                <div className="p-3 rounded-lg bg-red-500/8 border border-red-500/20">
                  <p className="text-xs text-red-400 font-semibold mb-1">Minor issues ({fbImportResult.errors.length})</p>
                  {fbImportResult.errors.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-[10px] text-[#8B8D97]">{e}</p>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => { setFbImportOpen(false); resetFbImport(); }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10"
                >
                  Done
                </Button>
                <Button
                  variant="outline"
                  onClick={resetFbImport}
                  className="h-10 border-[#2A2D3A] text-[#8B8D97]"
                >
                  Import More
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Consent Modal */}
      <ConsentModal
        open={!!consentPlatform}
        platform={consentPlatform}
        onClose={() => setConsentPlatform(null)}
        onAccept={() => { handleOAuthConnect(consentPlatform); setConsentPlatform(null); }}
      />

      {/* Reconnect dialog */}
      <Dialog open={!!connectDialog} onOpenChange={() => setConnectDialog(null)}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
          <DialogHeader>
            <DialogTitle>
              Reconnect {connectDialog?.emoji} {connectDialog?.name}
            </DialogTitle>
            <DialogDescription className="text-[#8B8D97] text-sm">
              This will take you to {connectDialog?.name}&apos;s official sign-in page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex gap-2">
              <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-[#8B8D97]">
                Your {connectDialog?.name} password is never shared with Klip4ge.
                We use official OAuth — the same method trusted by millions of apps.
              </p>
            </div>
            {connectDialog?.apiLimitation && (
              <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300">{connectDialog.syncNote}</p>
              </div>
            )}
            <Button
              onClick={() => handleOAuthConnect(connectDialog)}
              className="w-full h-12 text-white text-base font-semibold"
              style={connectDialog ? { background: connectDialog.color } : {}}
            >
              Continue to {connectDialog?.name} →
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConnectDialog(null)}
              className="w-full text-[#8B8D97]"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
