import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Loader2, Zap } from "lucide-react";
import { useSubscription } from "@/components/shared/useSubscription";

const PLATFORMS = [
  {
    id: "discord",
    name: "Discord",
    emoji: "🎮",
    icon: "Discord",
    description: "Saved messages, bookmarks, and channel content",
    scopes: "identify,guilds,guilds.members.read",
    features: ["Sync saved messages", "Create saves from bookmarks", "Share to channels"],
    color: "#5865F2",
  },
  {
    id: "twitch",
    name: "Twitch",
    emoji: "📺",
    icon: "Twitch",
    description: "Bookmarked streams, followed channels, and clips",
    scopes: "user:read:email,user:read:follows,clips:read",
    features: ["Sync bookmarked streams", "Add channel follows", "Save clips"],
    color: "#9146FF",
  },
  {
    id: "youtube",
    name: "YouTube",
    emoji: "▶️",
    icon: "YouTube",
    description: "Watch later, liked videos, and subscriptions",
    scopes: "youtube.readonly",
    features: ["Watch later playlist", "Liked videos", "Post to community"],
    color: "#FF0000",
  },
  {
    id: "spotify",
    name: "Spotify",
    emoji: "🎵",
    icon: "Spotify",
    description: "Saved tracks, playlists, and podcast episodes",
    scopes: "user-library-read,user-read-private",
    features: ["Sync saved tracks", "Playlists", "Podcast bookmarks"],
    color: "#1DB954",
  },
  {
    id: "apple_podcasts",
    name: "Apple Podcasts",
    emoji: "🎧",
    icon: "Podcast",
    description: "Bookmarked episodes and listening history",
    scopes: "podcast.read",
    features: ["Bookmarked episodes", "Listened podcasts"],
    color: "#FA243C",
  },
];

export default function StreamingPlatformsPanel() {
  const { user, plan, isPro, isFamily } = useSubscription();
  const queryClient = useQueryClient();
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState({});

  const { data: connections = [] } = useQuery({
    queryKey: ["streamingConnections", user?.email],
    queryFn: () => base44.entities.StreamingConnection.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const connectionMap = Object.fromEntries(connections.map(c => [c.platform, c]));

  const handleConnect = (platform) => {
    if (!user) {
      alert("Please log in to connect platforms");
      return;
    }

    // Check free tier limit (50 items total across all platforms)
    const isFree = !isPro && !isFamily;
    if (isFree && connections.length >= 1) {
      alert("Free tier limited to 1 platform. Upgrade to Premium to connect more.");
      return;
    }

    setSelectedPlatform(platform);
    setConsentDialogOpen(true);
  };

  const handleOAuthRedirect = async (platform) => {
    // In production, this would redirect to backend OAuth flow
    // For now, simulate OAuth consent flow
    const oauthUrl = await base44.functions.invoke("streamingOAuthInit", {
      platform: platform.id,
      userEmail: user.email,
    });

    if (oauthUrl?.redirect_url) {
      window.location.href = oauthUrl.redirect_url;
    }
  };

  const handleSync = async (platform) => {
    setSyncing(prev => ({ ...prev, [platform]: true }));
    try {
      await base44.functions.invoke("streamingFetchItems", {
        platform,
        userEmail: user.email,
      });
      queryClient.invalidateQueries({ queryKey: ["streamingConnections"] });
      alert(`✅ Synced ${platform}!`);
    } catch (err) {
      alert(`❌ Sync failed: ${err.message}`);
    } finally {
      setSyncing(prev => ({ ...prev, [platform]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {(isPro || isFamily) && (
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#8B8D97]">
            <p className="text-emerald-400 font-medium mb-1">Unlimited streaming imports</p>
            Fetch all your content, no monthly limits. Data syncs securely to your ClipForge vault.
          </div>
        </div>
      )}

      {!isPro && !isFamily && (
        <div className="p-3 rounded-xl bg-[#9370DB]/5 border border-[#9370DB]/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#9370DB] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#8B8D97]">
            <p className="text-[#E8E8ED] font-medium mb-1">Free tier: 50 items total</p>
            Connect 1 platform, fetch up to 50 items combined. Premium/Family = unlimited imports.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map(platform => {
          const conn = connectionMap[platform.id];
          const isConnected = conn?.connected;

          return (
            <Card key={platform.id} className="glass-card p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">{platform.emoji}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{platform.name}</h4>
                      <p className="text-xs text-[#8B8D97]">{platform.description}</p>
                    </div>
                  </div>
                  {isConnected && (
                    <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      ✓ Connected
                    </Badge>
                  )}
                </div>

                <ul className="text-xs text-[#8B8D97] space-y-1">
                  {platform.features.map(f => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>

                <div className="flex gap-2 pt-2">
                  {!isConnected ? (
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      style={{ background: platform.color }}
                      onClick={() => handleConnect(platform)}
                    >
                      Connect
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleSync(platform.id)}
                        disabled={syncing[platform.id]}
                      >
                        {syncing[platform.id] ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Syncing</>
                        ) : (
                          <><Zap className="w-3 h-3 mr-1" /> Sync Now</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-[#2A2D3A]"
                        onClick={() => handleConnect(platform)}
                      >
                        Reconnect
                      </Button>
                    </>
                  )}
                </div>

                {conn?.last_synced && (
                  <p className="text-[10px] text-[#8B8D97]">
                    Last synced: {new Date(conn.last_synced).toLocaleDateString()}
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Consent Dialog */}
      {selectedPlatform && (
        <Dialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
          <DialogContent className="max-w-md bg-[#1A1D27] border-[#2A2D3A]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{selectedPlatform.emoji}</span>
                Connect {selectedPlatform.name}
              </DialogTitle>
              <DialogDescription className="text-[#8B8D97]">
                ClipForge will request permission to access your {selectedPlatform.name} account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[#0F1117] border border-[#2A2D3A]">
                <p className="text-xs font-semibold text-[#E8E8ED] mb-2">We will access:</p>
                <ul className="space-y-1 text-xs text-[#8B8D97]">
                  {selectedPlatform.features.map(f => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-[#0F1117] border border-[#2A2D3A]">
                <p className="text-xs text-[#8B8D97]">
                  <strong className="text-[#E8E8ED]">Privacy:</strong> We do not store your login credentials. OAuth tokens are encrypted and only used to sync your content.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-[#2A2D3A]"
                  onClick={() => setConsentDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 text-white"
                  style={{ background: selectedPlatform.color }}
                  onClick={() => {
                    setConsentDialogOpen(false);
                    handleOAuthRedirect(selectedPlatform);
                  }}
                >
                  Authorize & Connect
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}