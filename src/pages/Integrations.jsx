import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SocialConnectPanel from "@/components/integrations/SocialConnectPanel";
import StreamingPlatformsPanel from "@/components/integrations/StreamingPlatformsPanel";
import FindFriendsPanel from "@/components/friends/FindFriendsPanel";
import { useSubscription } from "@/components/shared/useSubscription";
import {
  ShoppingBag, Utensils, ExternalLink,
  CheckCircle2, AlertCircle, Users2, Lock
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const HEALTH_APPS = [
  { id: "myfitnesspal", name: "MyFitnessPal", emoji: "💪", color: "#0066CC", description: "Track calories from saved recipes" },
  { id: "apple_health", name: "Apple Health", emoji: "🍎", color: "#FF2D55", description: "Sync activity and nutrition data" },
  { id: "cronometer", name: "Cronometer", emoji: "📊", color: "#F97316", description: "Detailed nutrition from recipes" },
];

export default function Integrations() {
  const [user, setUser] = useState(null);
  const [savedKeys, setSavedKeys] = useState({});
  const queryClient = useQueryClient();
  const { plan, isPro } = useSubscription();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    const keys = JSON.parse(localStorage.getItem("cf_api_keys") || "{}");
    setSavedKeys(keys);
  }, []);

  const isPremium = isPro;

  const saveKey = (key, value) => {
    const updated = { ...savedKeys, [key]: value };
    setSavedKeys(updated);
    localStorage.setItem("cf_api_keys", JSON.stringify(updated));
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-2xl">🔌</span> Integrations
          </h1>
          <p className="text-[#8B8D97] text-sm">Connect Discord, Twitch, YouTube, Spotify & more to sync your saves automatically</p>
        </div>
      </div>

      {/* Streaming hero banner */}
      <div className="rounded-2xl p-4 md:p-5 border border-[#9370DB]/25 animate-gradient-shift overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, rgba(0,191,255,0.06), rgba(147,112,219,0.10), rgba(255,182,193,0.05))", backgroundSize: "200% 200%" }}>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9370DB] mb-1">🎮 Streaming Platforms</p>
            <h2 className="text-lg font-black gradient-text mb-1">Auto-sync Discord, Twitch, YouTube & Podcasts</h2>
            <p className="text-xs text-[#8B8D97]">Connect once, sync all your bookmarks, liked videos, followed channels, and podcast episodes directly to your ClipForge vault.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {["🎮", "📺", "▶️", "🎵", "🎧"].map((e, i) => (
              <span key={i} className="text-2xl w-10 h-10 rounded-xl bg-[#1A1D27] border border-[#2A2D3A] flex items-center justify-center">{e}</span>
            ))}
          </div>
        </div>
      </div>

      {!isPremium && (
        <div className="p-3 rounded-xl bg-[#9370DB]/5 border border-[#9370DB]/20 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-[#9370DB] flex-shrink-0" />
          <p className="text-xs text-[#8B8D97] flex-1">Social, recipe & shopping connections are <strong className="text-[#E8E8ED]">free</strong>. Streaming & health require <strong className="text-[#E8E8ED]">Premium</strong>.</p>
          <Button size="sm" className="bg-[#9370DB] text-white text-xs" asChild>
            <a href="/Pricing">Upgrade</a>
          </Button>
        </div>
      )}

      <Tabs defaultValue="streaming">
         <TabsList className="bg-[#1A1D27] border border-[#2A2D3A] flex-wrap h-auto gap-1 p-1">
           <TabsTrigger value="friends" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF] text-xs">
             👥 Find Friends
           </TabsTrigger>
           <TabsTrigger value="social" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF] text-xs">
             Social Media
           </TabsTrigger>
           <TabsTrigger value="streaming" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF] text-xs">
             🎵 Streaming
           </TabsTrigger>
           <TabsTrigger value="shopping" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF] text-xs">
             Shopping
           </TabsTrigger>
           <TabsTrigger value="recipes" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF] text-xs">
             Recipes
           </TabsTrigger>
           <TabsTrigger value="health" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF] text-xs">
             Health
           </TabsTrigger>
         </TabsList>

        <TabsContent value="friends" className="mt-4">
          <Card className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <Users2 className="w-5 h-5 text-[#00BFFF]" />
              <div>
                <h3 className="font-semibold">Find Friends</h3>
                <p className="text-xs text-[#8B8D97]">Discover followers from your social platforms who are already on ClipForge</p>
              </div>
            </div>
            <FindFriendsPanel user={user} plan={plan} />
          </Card>
        </TabsContent>

        <TabsContent value="social" className="mt-4">
          <SocialConnectPanel />
        </TabsContent>

        <TabsContent value="streaming" className="mt-4">
          <StreamingPlatformsPanel />
        </TabsContent>

        <TabsContent value="shopping" className="mt-4 space-y-4">
          <Card className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <ShoppingBag className="w-5 h-5 text-[#F59E0B]" />
              <h3 className="font-semibold">Amazon Product Lookup</h3>
              <Badge variant="outline" className="text-[10px] border-[#F59E0B]/30 text-[#F59E0B]">Amazon PA-API</Badge>
            </div>
            <p className="text-xs text-[#8B8D97] mb-4">
              Automatically fetch product details, prices, and deals for items you save. Requires an Amazon Product Advertising API key.
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-[#8B8D97]">Access Key ID</Label>
                <Input
                  type="password"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  value={savedKeys.amazon_access_key || ""}
                  onChange={(e) => saveKey("amazon_access_key", e.target.value)}
                  className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
                />
              </div>
              <div>
                <Label className="text-xs text-[#8B8D97]">Secret Key</Label>
                <Input
                  type="password"
                  placeholder="wJalrXUtnFEMI/K7MDENG"
                  value={savedKeys.amazon_secret_key || ""}
                  onChange={(e) => saveKey("amazon_secret_key", e.target.value)}
                  className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
                />
              </div>
              <div>
                <Label className="text-xs text-[#8B8D97]">Associate Tag</Label>
                <Input
                  placeholder="yourtag-20"
                  value={savedKeys.amazon_tag || ""}
                  onChange={(e) => saveKey("amazon_tag", e.target.value)}
                  className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="bg-[#F59E0B] text-white" onClick={() => alert("Keys saved to local storage")}>
                  {savedKeys.amazon_access_key ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Saved</> : "Save Keys"}
                </Button>
                <a href="https://affiliate-program.amazon.com/assoc_credentials/home" target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="border-[#2A2D3A] text-xs gap-1">
                    Get API Keys <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
            </div>
          </Card>

          <Card className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">🎟️</span>
              <h3 className="font-semibold">Ticketmaster API</h3>
              <Badge variant="outline" className="text-[10px] border-emerald-400/30 text-emerald-400">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1 inline" />Active
              </Badge>
            </div>
            <p className="text-xs text-[#8B8D97] mb-3">Real event discovery with live ticket availability and pricing, powered by the Ticketmaster Discovery API.</p>
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> API key configured securely as a server secret
              </p>
              <p className="text-[10px] text-[#8B8D97] mt-1">Events page now queries Ticketmaster live data automatically.</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="recipes" className="mt-4">
          <Card className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <Utensils className="w-5 h-5 text-[#FFB6C1]" />
              <h3 className="font-semibold">Spoonacular Recipe API</h3>
              <Badge variant="outline" className="text-[10px] border-emerald-400/30 text-emerald-400">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1 inline" />Active
              </Badge>
            </div>
            <p className="text-xs text-[#8B8D97] mb-3">
              Extracts detailed ingredient lists, quantities, and nutritional info from recipe URLs — then auto-exports to shopping lists.
            </p>
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> API key configured securely as a server secret
              </p>
              <p className="text-[10px] text-[#8B8D97] mt-1">Shopping Lists now auto-extract real ingredients via Spoonacular with AI fallback.</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="mt-4 space-y-4">
          {!isPremium && (
            <div className="p-3 rounded-xl bg-[#9370DB]/5 border border-[#9370DB]/20 flex items-center gap-3 mb-2">
              <Lock className="w-4 h-4 text-[#9370DB] flex-shrink-0" />
              <p className="text-xs text-[#8B8D97] flex-1">Health app sync requires <strong className="text-[#E8E8ED]">Premium</strong>.</p>
              <Link to={createPageUrl("Pricing")}>
                <Button size="sm" className="bg-[#9370DB] text-white text-xs">Upgrade</Button>
              </Link>
            </div>
          )}
          {HEALTH_APPS.map(app => (
            <Card key={app.id} className="glass-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{app.emoji}</span>
                  <div>
                    <h3 className="font-semibold text-sm">{app.name}</h3>
                    <p className="text-xs text-[#8B8D97]">{app.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-[#2A2D3A] text-xs" disabled={!isPremium}>
                    {isPremium ? "Connect" : "🔒 Premium"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          <div className="p-3 rounded-xl bg-[#0F1117] border border-[#2A2D3A]">
            <p className="text-xs text-[#8B8D97]">
              Health app integrations sync nutritional data from your saved recipes to track calorie targets and macros.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}