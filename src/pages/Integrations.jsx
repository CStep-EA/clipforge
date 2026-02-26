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
import {
  ShoppingBag, Heart, Utensils, ExternalLink,
  CheckCircle2, Settings, AlertCircle
} from "lucide-react";

const HEALTH_APPS = [
  { id: "myfitnesspal", name: "MyFitnessPal", emoji: "💪", color: "#0066CC", description: "Track calories from saved recipes" },
  { id: "apple_health", name: "Apple Health", emoji: "🍎", color: "#FF2D55", description: "Sync activity and nutrition data" },
  { id: "cronometer", name: "Cronometer", emoji: "📊", color: "#F97316", description: "Detailed nutrition from recipes" },
];

export default function Integrations() {
  const [user, setUser] = useState(null);
  const [savedKeys, setSavedKeys] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    const keys = JSON.parse(localStorage.getItem("cf_api_keys") || "{}");
    setSavedKeys(keys);
  }, []);

  const { data: subData = [] } = useQuery({
    queryKey: ["subscription", user?.email],
    queryFn: () => base44.entities.UserSubscription.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const isPremium = subData[0]?.plan === "premium";

  const saveKey = (key, value) => {
    const updated = { ...savedKeys, [key]: value };
    setSavedKeys(updated);
    localStorage.setItem("cf_api_keys", JSON.stringify(updated));
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-[#8B8D97] text-sm">Connect your favorite platforms</p>
      </div>

      {!isPremium && (
        <div className="p-3 rounded-xl bg-[#9370DB]/5 border border-[#9370DB]/20 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-[#9370DB] flex-shrink-0" />
          <p className="text-xs text-[#8B8D97] flex-1">Social, recipe & shopping connections are <strong className="text-[#E8E8ED]">free</strong>. Health app sync requires Premium.</p>
          <Button size="sm" className="bg-[#9370DB] text-white text-xs" onClick={() => window.location.href = "/Pricing"}>
            Upgrade
          </Button>
        </div>
      )}

      <Tabs defaultValue="social">
        <TabsList className="bg-[#1A1D27] border border-[#2A2D3A]">
          <TabsTrigger value="social" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF]">
            Social Media
          </TabsTrigger>
          <TabsTrigger value="shopping" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF]">
            Shopping
          </TabsTrigger>
          <TabsTrigger value="recipes" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF]">
            Recipes
          </TabsTrigger>
          <TabsTrigger value="health" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF]">
            Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="social" className="mt-4">
          <SocialConnectPanel />
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
                    {isPremium ? "Connect" : "Premium Only"}
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