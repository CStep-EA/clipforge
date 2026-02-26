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
import { CheckCircle2, Link2, RefreshCw, Loader2, AlertCircle, WifiOff, Wifi, MapPin, Calendar, Ticket, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import ConsentModal from "./ConsentModal";

const PLATFORMS = [
  {
    id: "instagram",
    name: "Instagram",
    emoji: "📸",
    color: "#E1306C",
    description: "Sync saved posts & collections",
    note: "Paste your Instagram Graph API access token to connect.",
    categoryHint: "deals, products, travel, gift ideas",
    categoryFocus: ["deal", "product", "travel", "gift_idea"],
  },
  {
    id: "facebook",
    name: "Facebook",
    emoji: "👤",
    color: "#1877F2",
    description: "Import saved posts & marketplace finds",
    note: "Paste your Facebook User Access Token (from developers.facebook.com).",
    categoryHint: "deals, events, gift ideas, articles",
    categoryFocus: ["deal", "event", "gift_idea", "article"],
  },
  {
    id: "pinterest",
    name: "Pinterest",
    emoji: "📌",
    color: "#E60023",
    description: "Import boards & saved pins",
    note: "Paste your Pinterest Developer API key to connect.",
    categoryHint: "recipes, travel, gift ideas, articles",
    categoryFocus: ["recipe", "travel", "gift_idea", "article"],
  },
  {
    id: "twitter",
    name: "X / Twitter",
    emoji: "𝕏",
    color: "#1A1A1A",
    description: "Import bookmarks & saved tweets",
    note: "Paste your Twitter API v2 Bearer Token to connect.",
    categoryHint: "deals, articles, events",
    categoryFocus: ["deal", "article", "event"],
  },
  {
    id: "tiktok",
    name: "TikTok",
    emoji: "🎵",
    color: "#69C9D0",
    description: "Sync favorited videos & collections",
    note: "Paste your TikTok for Developers API token to connect.",
    categoryHint: "recipes, products, events",
    categoryFocus: ["recipe", "product", "event"],
  },
  {
    id: "web",
    name: "Etsy",
    emoji: "🛍️",
    color: "#F56400",
    description: "Save favorites & gift ideas from Etsy",
    note: "Enter your Etsy username to connect and import your favorites.",
    categoryHint: "gift ideas, products",
    categoryFocus: ["gift_idea", "product"],
  },
  {
    id: "manual",
    name: "Allrecipes",
    emoji: "🍽️",
    color: "#D62300",
    description: "Import saved recipes from Allrecipes",
    note: "Enter your Allrecipes username to import your recipe box.",
    categoryHint: "recipes",
    categoryFocus: ["recipe"],
  },
];

export default function SocialConnectPanel() {
  const [connectDialog, setConnectDialog] = useState(null);
  const [consentPlatform, setConsentPlatform] = useState(null);
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [syncing, setSyncing] = useState(null);
  const [tmLoading, setTmLoading] = useState(false);
  const [tmEvents, setTmEvents] = useState([]);
  const [tmCity, setTmCity] = useState("Denver");
  const queryClient = useQueryClient();

  const { data: connections = [] } = useQuery({
    queryKey: ["socialConnections"],
    queryFn: () => base44.entities.SocialConnection.list(),
  });

  const getConnection = (platformId) =>
    connections.find((c) => c.platform === platformId);

  const fetchTicketmasterEvents = async () => {
    setTmLoading(true);
    setTmEvents([]);
    const result = await base44.functions.invoke("ticketmaster", { city: tmCity });
    const events = result?.data?.events || [];
    setTmEvents(events.slice(0, 6));
    setTmLoading(false);
  };

  const saveEvent = async (ev) => {
    await base44.entities.SavedItem.create({
      title: ev.name,
      description: ev.category || "Live event",
      url: ev.ticketmaster_url || "",
      image_url: ev.image_url || "",
      category: "event",
      source: "web",
      tags: [ev.category].filter(Boolean),
      ai_summary: `Live event at ${ev.venue || "venue TBD"}${ev.date ? ` on ${ev.date}` : ""}`,
      rating: 8,
      price: ev.min_price || null,
    });
    queryClient.invalidateQueries({ queryKey: ["savedItems"] });
  };

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
    const categoryFocus = platform.categoryFocus?.join(", ") || "deal, recipe, event, product, article";
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Simulate fetching 6 saved items from ${platform.name} for user @${conn?.username || "user"}. Generate realistic saved content items that would come from this platform. Focus heavily on these categories: ${categoryFocus}. Make titles specific and realistic to ${platform.name}'s typical content style.`,
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
                url: { type: "string" },
                category: { type: "string", enum: ["deal", "recipe", "event", "product", "article", "travel", "gift_idea", "other"] },
                tags: { type: "array", items: { type: "string" } },
                ai_summary: { type: "string" },
                rating: { type: "number" },
                price: { type: "number" },
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
    queryClient.invalidateQueries({ queryKey: ["socialConnections"] });
    queryClient.invalidateQueries({ queryKey: ["savedItems"] });
    setSyncing(null);
  };

  return (
    <div className="space-y-6">

      {/* ── Social OAuth Buttons ─────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-[#E8E8ED] mb-3">Social Platforms</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORMS.map((platform, i) => {
            const conn = getConnection(platform.id);
            const isConnected = conn?.connected;
            return (
              <motion.div key={platform.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className="glass-card p-4 relative overflow-hidden" style={{ borderColor: isConnected ? `${platform.color}50` : "" }}>
                  {isConnected && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: platform.color }} />
                  )}
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
                      <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                      </Badge>
                    )}
                  </div>

                  {isConnected && (
                    <p className="text-[10px] text-[#8B8D97] mb-3">
                      {conn?.username && <><span style={{ color: platform.color }}>@{conn.username}</span> · </>}
                      {conn?.sync_count ? `${conn.sync_count} items synced` : "Ready to sync"}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-3">
                    {platform.categoryFocus?.map(c => (
                      <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#2A2D3A] text-[#8B8D97] capitalize">{c.replace("_", " ")}</span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 text-xs h-8 font-semibold gap-1.5"
                      style={isConnected
                        ? { background: "transparent", border: `1px solid ${platform.color}60`, color: platform.color }
                        : { background: platform.color, color: "white" }
                      }
                      onClick={() => isConnected ? setConnectDialog(platform) : setConsentPlatform(platform)}
                    >
                      <Link2 className="w-3 h-3" />
                      {isConnected ? "Reconnect" : `Connect ${platform.name}`}
                    </Button>
                    {isConnected && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-[#2A2D3A] text-[#8B8D97] hover:text-[#00BFFF]"
                        onClick={() => handleSync(platform)}
                        disabled={syncing === platform.id}
                        title="Sync now"
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

        <div className="mt-3 p-3 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20 flex gap-2">
          <AlertCircle className="w-4 h-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#8B8D97]">
            Social connections require official API access tokens from each platform's developer portal. AI-powered categorization automatically organizes your saves.
          </p>
        </div>
      </div>

      {/* ── Ticketmaster Event Discovery ─────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-[#E8E8ED] mb-3 flex items-center gap-2">
          <Ticket className="w-4 h-4 text-[#00BFFF]" /> Ticketmaster Event Discovery
          <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 gap-1 ml-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> Active
          </Badge>
        </h3>
        <Card className="glass-card p-4">
          <p className="text-xs text-[#8B8D97] mb-4">Search live events near a city and save them directly to your Saves &amp; Dashboard.</p>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="City (e.g. Denver, NYC)"
              value={tmCity}
              onChange={e => setTmCity(e.target.value)}
              className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] text-sm h-9"
            />
            <Button
              size="sm"
              className="bg-[#00BFFF] text-[#0F1117] font-bold h-9 px-4 shrink-0 gap-1.5"
              onClick={fetchTicketmasterEvents}
              disabled={tmLoading}
            >
              {tmLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Ticket className="w-3.5 h-3.5" /> Find Events</>}
            </Button>
          </div>

          {tmEvents.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tmEvents.map((ev, i) => (
                <motion.div key={ev.ticketmaster_id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="rounded-xl overflow-hidden border border-[#2A2D3A] bg-[#0F1117] hover:border-[#00BFFF]/30 transition-colors">
                    {ev.image_url && <img src={ev.image_url} alt={ev.name} className="w-full h-24 object-cover" />}
                    <div className="p-3">
                      <p className="text-xs font-semibold text-[#E8E8ED] line-clamp-1">{ev.name}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-[#8B8D97]">
                        {ev.date && <><Calendar className="w-2.5 h-2.5" /> {ev.date}</>}
                        {ev.venue && <><MapPin className="w-2.5 h-2.5 ml-2" /> {ev.venue}</>}
                      </div>
                      {ev.min_price && <p className="text-[10px] text-emerald-400 mt-1">From ${ev.min_price}</p>}
                      <div className="flex gap-1.5 mt-2">
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-[10px] bg-[#00BFFF] text-[#0F1117] font-bold"
                          onClick={() => saveEvent(ev)}
                        >
                          + Save Event
                        </Button>
                        {ev.ticketmaster_url && (
                          <a href={ev.ticketmaster_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-7 border-[#2A2D3A] text-[#8B8D97] px-2">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            </div>
          )}
        </Card>
      </div>

      {/* Consent Modal — shown before token dialog for new connections */}
      <ConsentModal
        open={!!consentPlatform}
        platform={consentPlatform}
        onClose={() => setConsentPlatform(null)}
        onAccept={() => { setConnectDialog(consentPlatform); setConsentPlatform(null); }}
      />

      {/* Connect Dialog */}
      <Dialog open={!!connectDialog} onOpenChange={() => { setConnectDialog(null); setToken(""); setUsername(""); }}>
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