import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Loader2, Zap, RefreshCw, Lock, ExternalLink, Share2, Wifi, WifiOff } from "lucide-react";
import { useSubscription } from "@/components/shared/useSubscription";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PLATFORMS = [
  {
    id: "discord",
    name: "Discord",
    emoji: "🎮",
    color: "#5865F2",
    description: "Sync bookmarked messages & channel content",
    category: "stream",
    features: ["Saved messages", "Channel bookmarks", "Share saves to channels"],
    shareLabel: "Post to Discord",
    freeAllowed: true,
  },
  {
    id: "twitch",
    name: "Twitch",
    emoji: "📺",
    color: "#9146FF",
    description: "Followed channels, clips & bookmarked streams",
    category: "stream",
    features: ["Followed channels", "Saved clips", "Bookmarked VODs"],
    shareLabel: null,
    freeAllowed: false,
  },
  {
    id: "youtube",
    name: "YouTube",
    emoji: "▶️",
    color: "#FF0000",
    description: "Watch Later, Liked Videos & Subscriptions",
    category: "video",
    features: ["Watch Later playlist", "Liked videos", "Channel subscriptions"],
    shareLabel: null,
    freeAllowed: false,
  },
  {
    id: "spotify",
    name: "Spotify",
    emoji: "🎵",
    color: "#1DB954",
    description: "Saved tracks, playlists & podcast episodes",
    category: "podcast",
    features: ["Saved tracks", "Playlists", "Podcast subscriptions"],
    shareLabel: null,
    freeAllowed: false,
  },
  {
    id: "apple_podcasts",
    name: "Apple Podcasts",
    emoji: "🎧",
    color: "#FA243C",
    description: "Bookmarked episodes & listening history",
    category: "podcast",
    features: ["Bookmarked episodes", "Followed shows", "Listening history"],
    shareLabel: null,
    freeAllowed: false,
  },
];

const categoryLabels = { stream: "🎮 Stream", video: "▶️ Video", podcast: "🎧 Podcast" };
const categoryColors = { stream: "#5865F2", video: "#FF0000", podcast: "#FA243C" };

export default function StreamingPlatformsPanel() {
  const { user, isPro, isFamily } = useSubscription();
  const queryClient = useQueryClient();
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(null); // { platform, item }
  const [syncing, setSyncing] = useState({});
  const [connecting, setConnecting] = useState({});

  const isPremium = isPro || isFamily;

  const { data: connections = [] } = useQuery({
    queryKey: ["streamingConnections", user?.email],
    queryFn: () => base44.entities.StreamingConnection.filter({ user_email: user?.email }),
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  const { data: recentSaves = [] } = useQuery({
    queryKey: ["recentSaves"],
    queryFn: () => base44.entities.SavedItem.list("-created_date", 10),
    enabled: !!user?.email,
  });

  const connectionMap = Object.fromEntries(connections.map(c => [c.platform, c]));
  const totalSynced = connections.reduce((acc, c) => acc + (c.sync_count || 0), 0);

  const handleConnect = (platform) => {
    if (!isPremium && !platform.freeAllowed) {
      toast.error("This platform requires Premium. Upgrade to connect.");
      return;
    }
    setSelectedPlatform(platform);
    setConsentOpen(true);
  };

  const handleOAuthRedirect = async (platform) => {
    setConnecting(prev => ({ ...prev, [platform.id]: true }));
    try {
      const res = await base44.functions.invoke("streamingOAuthInit", {
        platform: platform.id,
        userEmail: user.email,
      });
      if (res?.data?.redirect_url) {
        window.location.href = res.data.redirect_url;
      } else {
        toast.error("Could not initiate OAuth flow. Check platform credentials.");
      }
    } catch (err) {
      toast.error(`Failed to connect ${platform.name}: ${err.message}`);
    } finally {
      setConnecting(prev => ({ ...prev, [platform.id]: false }));
    }
  };

  const handleSync = async (platformId) => {
    setSyncing(prev => ({ ...prev, [platformId]: true }));
    try {
      const res = await base44.functions.invoke("streamingFetchItems", {
        platform: platformId,
        userEmail: user.email,
      });
      queryClient.invalidateQueries({ queryKey: ["streamingConnections"] });
      queryClient.invalidateQueries({ queryKey: ["savedItems"] });
      const count = res?.data?.itemsCreated || 0;
      toast.success(`✅ Synced ${count} new item${count !== 1 ? "s" : ""} from ${platformId}`);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      if (msg?.includes("50 items")) {
        toast.error("Monthly limit reached (50 items). Upgrade to Premium for unlimited.");
      } else {
        toast.error(`Sync failed: ${msg}`);
      }
    } finally {
      setSyncing(prev => ({ ...prev, [platformId]: false }));
    }
  };

  const handleShareToDiscord = async (itemId) => {
    try {
      await base44.functions.invoke("streamingShareItem", {
        platform: "discord",
        userEmail: user.email,
        itemId,
      });
      toast.success("Shared to Discord!");
      setShareOpen(null);
    } catch (err) {
      toast.error("Failed to share to Discord");
    }
  };

  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#00BFFF]">{connections.filter(c => c.connected).length}</p>
          <p className="text-[10px] text-[#8B8D97]">Connected</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#9370DB]">{totalSynced}</p>
          <p className="text-[10px] text-[#8B8D97]">Total Syncs</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#FFB6C1]">{isPremium ? "∞" : "50"}</p>
          <p className="text-[10px] text-[#8B8D97]">Items/mo</p>
        </div>
      </div>

      {!isPremium && (
        <div className="p-3 rounded-xl bg-[#9370DB]/5 border border-[#9370DB]/20 flex items-center gap-3">
          <Lock className="w-4 h-4 text-[#9370DB] shrink-0" />
          <p className="text-xs text-[#8B8D97] flex-1">
            <strong className="text-[#E8E8ED]">Discord</strong> is free. Twitch, YouTube, Spotify & Podcasts require <strong className="text-[#E8E8ED]">Premium</strong> for unlimited syncing.
          </p>
          <Link to={createPageUrl("Pricing")}>
            <Button size="sm" className="bg-[#9370DB] text-white text-xs shrink-0">Upgrade</Button>
          </Link>
        </div>
      )}

      {isPremium && (
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-300">Unlimited streaming imports active — all platforms unlocked.</p>
        </div>
      )}

      {/* Platform cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map(platform => {
          const conn = connectionMap[platform.id];
          const isConnected = conn?.connected;
          const locked = !isPremium && !platform.freeAllowed;

          return (
            <Card key={platform.id} className={`glass-card p-4 transition-all ${locked ? "opacity-60" : ""}`}>
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">{platform.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{platform.name}</h4>
                        <Badge variant="outline" className="text-[8px] px-1.5 py-0" style={{ color: categoryColors[platform.category], borderColor: `${categoryColors[platform.category]}40` }}>
                          {categoryLabels[platform.category]}
                        </Badge>
                        {locked && <Badge variant="outline" className="text-[8px] px-1.5 border-amber-500/30 text-amber-400">Premium</Badge>}
                      </div>
                      <p className="text-xs text-[#8B8D97] mt-0.5">{platform.description}</p>
                    </div>
                  </div>
                  {isConnected ? (
                    <div className="flex items-center gap-1 text-emerald-400">
                      <Wifi className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Live</span>
                    </div>
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-[#8B8D97]" />
                  )}
                </div>

                {/* Features */}
                <ul className="text-[11px] text-[#8B8D97] space-y-0.5">
                  {platform.features.map(f => (
                    <li key={f} className="flex items-center gap-1">
                      <span className="text-[#00BFFF]/60">·</span> {f}
                    </li>
                  ))}
                </ul>

                {/* Sync stats */}
                {conn && (
                  <div className="flex items-center gap-3 text-[10px] text-[#8B8D97] border-t border-[#2A2D3A] pt-2">
                    {conn.platform_username && <span>@{conn.platform_username}</span>}
                    {conn.last_synced && <span>Last sync: {new Date(conn.last_synced).toLocaleDateString()}</span>}
                    {conn.sync_count > 0 && <span>{conn.sync_count} syncs</span>}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {!isConnected ? (
                    <Button
                      size="sm"
                      className="flex-1 text-xs text-white font-semibold"
                      style={{ background: locked ? "#374151" : platform.color }}
                      onClick={() => handleConnect(platform)}
                      disabled={locked || connecting[platform.id]}
                    >
                      {connecting[platform.id] ? (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Connecting</>
                      ) : locked ? (
                        <><Lock className="w-3 h-3 mr-1" /> Premium Only</>
                      ) : (
                        <>Connect {platform.name}</>
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleSync(platform.id)}
                        disabled={syncing[platform.id]}
                      >
                        {syncing[platform.id] ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Syncing...</>
                        ) : (
                          <><Zap className="w-3 h-3 mr-1" /> Sync Now</>
                        )}
                      </Button>
                      {platform.shareLabel && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-[#2A2D3A] gap-1"
                          onClick={() => setShareOpen(platform.id)}
                        >
                          <Share2 className="w-3 h-3" /> Share
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-[#2A2D3A]"
                        onClick={() => handleConnect(platform)}
                        title="Reconnect"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* OAuth Consent Dialog */}
      {selectedPlatform && (
        <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
          <DialogContent className="max-w-md bg-[#1A1D27] border-[#2A2D3A]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <span className="text-xl">{selectedPlatform.emoji}</span>
                Connect {selectedPlatform.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#8B8D97]">
                ClipForge will securely request read-only access to your {selectedPlatform.name} account via OAuth.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#0F1117] border border-[#2A2D3A] space-y-2">
                <p className="text-xs font-semibold text-[#E8E8ED]">ClipForge will access:</p>
                <ul className="space-y-1">
                  {selectedPlatform.features.map(f => (
                    <li key={f} className="text-xs text-[#8B8D97] flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-[#0F1117] border border-[#2A2D3A]">
                <p className="text-xs text-[#8B8D97]">
                  <strong className="text-[#E8E8ED]">🔒 Privacy:</strong> We use read-only OAuth — no passwords stored. Tokens are encrypted. You can disconnect at any time.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs text-amber-300">
                  <strong>Ethical use:</strong> We only fetch your own bookmarks, saves, and followed content. We never post on your behalf without explicit action.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-[#2A2D3A] text-sm" onClick={() => setConsentOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 text-white text-sm font-semibold"
                  style={{ background: selectedPlatform.color }}
                  onClick={() => { setConsentOpen(false); handleOAuthRedirect(selectedPlatform); }}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Authorize & Connect
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Share to Discord dialog */}
      <Dialog open={!!shareOpen} onOpenChange={() => setShareOpen(null)}>
        <DialogContent className="max-w-sm bg-[#1A1D27] border-[#2A2D3A]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">🎮 Share to Discord</DialogTitle>
            <DialogDescription className="text-xs text-[#8B8D97]">Pick a recent save to post to your connected Discord channel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recentSaves.slice(0, 8).map(item => (
              <button
                key={item.id}
                className="w-full text-left p-2.5 rounded-lg bg-[#0F1117] border border-[#2A2D3A] hover:border-[#5865F2]/40 transition-all"
                onClick={() => handleShareToDiscord(item.id)}
              >
                <p className="text-xs font-medium truncate">{item.title}</p>
                <p className="text-[10px] text-[#8B8D97]">{item.category} · {item.source || "manual"}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}