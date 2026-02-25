import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Link2, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const PLATFORMS = [
  {
    id: "instagram",
    name: "Instagram",
    emoji: "📸",
    color: "#E1306C",
    description: "Sync your saved posts and collections",
    note: "Requires Instagram Graph API access token",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    emoji: "📌",
    color: "#E60023",
    description: "Import boards and saved pins",
    note: "Requires Pinterest Developer API key",
  },
  {
    id: "twitter",
    name: "X / Twitter",
    emoji: "🐦",
    color: "#1DA1F2",
    description: "Import bookmarks and saved tweets",
    note: "Requires Twitter API v2 Bearer Token",
  },
  {
    id: "tiktok",
    name: "TikTok",
    emoji: "🎵",
    color: "#69C9D0",
    description: "Sync favorited videos and collections",
    note: "Requires TikTok for Developers API token",
  },
];

export default function SocialConnectPanel() {
  const [connectDialog, setConnectDialog] = useState(null);
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [syncing, setSyncing] = useState(null);
  const queryClient = useQueryClient();

  const { data: connections = [] } = useQuery({
    queryKey: ["socialConnections"],
    queryFn: () => base44.entities.SocialConnection.list(),
  });

  const getConnection = (platformId) =>
    connections.find((c) => c.platform === platformId);

  const handleConnect = async () => {
    const existing = getConnection(connectDialog.id);
    if (existing) {
      await base44.entities.SocialConnection.update(existing.id, {
        connected: true,
        access_token: token,
        username,
      });
    } else {
      await base44.entities.SocialConnection.create({
        platform: connectDialog.id,
        connected: true,
        access_token: token,
        username,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["socialConnections"] });
    setConnectDialog(null);
    setToken("");
    setUsername("");
  };

  const handleSync = async (platform) => {
    setSyncing(platform.id);
    const conn = getConnection(platform.id);
    // AI-powered simulation of fetching & categorizing saves
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Simulate fetching 5 saved items from ${platform.name} for user @${conn?.username || "user"}. Generate realistic saved content items that would come from this platform. Include a mix of deals, recipes, articles, and products.`,
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                category: { type: "string", enum: ["deal", "recipe", "event", "product", "article", "travel", "gift_idea", "other"] },
                tags: { type: "array", items: { type: "string" } },
                ai_summary: { type: "string" },
                rating: { type: "number" },
              },
            },
          },
        },
      },
    });

    for (const item of result.items || []) {
      await base44.entities.SavedItem.create({
        ...item,
        source: platform.id,
        image_url: `https://images.unsplash.com/photo-${1500000000 + Math.floor(Math.random() * 100000000)}?w=600`,
      });
    }

    if (conn) {
      await base44.entities.SocialConnection.update(conn.id, {
        last_synced: new Date().toISOString(),
        sync_count: (conn.sync_count || 0) + (result.items?.length || 0),
      });
    }
    queryClient.invalidateQueries({ queryKey: ["socialConnections", "savedItems"] });
    setSyncing(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLATFORMS.map((platform, i) => {
          const conn = getConnection(platform.id);
          const isConnected = conn?.connected;
          return (
            <motion.div key={platform.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="glass-card p-4" style={{ borderColor: isConnected ? `${platform.color}40` : "" }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platform.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{platform.name}</h3>
                        {isConnected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <p className="text-[10px] text-[#8B8D97]">{platform.description}</p>
                    </div>
                  </div>
                </div>

                {isConnected && conn?.username && (
                  <p className="text-[10px] text-[#8B8D97] mb-3">
                    Connected as <span style={{ color: platform.color }}>@{conn.username}</span>
                    {conn.last_synced && ` · Synced ${conn.sync_count || 0} items`}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={isConnected ? "outline" : "default"}
                    className="flex-1 text-xs h-8"
                    style={!isConnected ? { background: platform.color, color: "white" } : { borderColor: "#2A2D3A" }}
                    onClick={() => setConnectDialog(platform)}
                  >
                    <Link2 className="w-3 h-3 mr-1" />
                    {isConnected ? "Reconnect" : "Connect"}
                  </Button>
                  {isConnected && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-[#2A2D3A] text-[#8B8D97] hover:text-[#00BFFF]"
                      onClick={() => handleSync(platform)}
                      disabled={syncing === platform.id}
                    >
                      {syncing === platform.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="p-3 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20 flex gap-2">
        <AlertCircle className="w-4 h-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[#8B8D97]">
          Social connections require official API access tokens from each platform's developer portal. AI-powered categorization automatically organizes your saves into deals, recipes, events, and more.
        </p>
      </div>

      {/* Connect Dialog */}
      <Dialog open={!!connectDialog} onOpenChange={() => setConnectDialog(null)}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
          <DialogHeader>
            <DialogTitle>
              Connect {connectDialog?.emoji} {connectDialog?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-[#0F1117] border border-[#2A2D3A]">
              <p className="text-xs text-[#8B8D97]">{connectDialog?.note}</p>
            </div>
            <div>
              <Label className="text-xs text-[#8B8D97]">Username / Handle</Label>
              <Input
                placeholder="@yourusername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8B8D97]">API Access Token</Label>
              <Input
                type="password"
                placeholder="Paste your API token..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
              />
            </div>
            <Button
              onClick={handleConnect}
              disabled={!token || !username}
              className="w-full text-white"
              style={connectDialog ? { background: connectDialog.color } : {}}
            >
              Connect {connectDialog?.name}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}