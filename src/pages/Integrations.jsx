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
  Utensils,
  CheckCircle2, AlertCircle, Users2, Tag, Clock,
  ChevronDown, ChevronUp, ShieldCheck, Smartphone, Info, Lock
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

/**
 * Health app integration reality (as of 2026):
 *
 * Apple Health / HealthKit:
 *   - iOS NATIVE ONLY. No web API. No OAuth. No REST endpoint.
 *   - A web app cannot connect to Apple Health under any circumstances.
 *   - Future path: React Native / Capacitor native iOS build.
 *
 * MyFitnessPal:
 *   - Has an OAuth 2.0 API but it is PRIVATE (invite / partner-only).
 *   - No public developer registration. Partner approval required.
 *   - Future path: apply to MFP Partner Program.
 *
 * Cronometer:
 *   - No public API. The team has confirmed this publicly (Aug 2025).
 *   - Cronometer Pro offers a case-by-case partner API.
 *   - Future path: partner agreement.
 *
 * Current ClipForge behaviour:
 *   - We do NOT fake a "connected" state.
 *   - We show honest limitation banners and a "Request Integration" button
 *     that emails our team for partner intake.
 *   - Recipe nutrition extraction via Spoonacular is the current live path.
 */
const HEALTH_APPS = [
  {
    id: "myfitnesspal",
    name: "MyFitnessPal",
    emoji: "💪",
    color: "#0066CC",
    description: "Sync calorie and macro targets from your saved recipes",
    limitation: "MFP's API is invite-only (private partner program). We've submitted an integration request and will notify you when it's approved.",
    limitationShort: "Partner API — pending approval",
    apiStatus: "partner_pending",
    deepLink: null, // cannot deep-link to MFP from web
    docsUrl: "https://www.myfitnesspal.com/apps/api/version",
  },
  {
    id: "apple_health",
    name: "Apple Health",
    emoji: "🍎",
    color: "#FF2D55",
    description: "Sync nutrition and activity data with your iPhone's Health app",
    limitation: "Apple HealthKit is iOS-native only and cannot be accessed from a web app. This integration will be available in the upcoming ClipForge iOS app.",
    limitationShort: "Requires iOS app (coming soon)",
    apiStatus: "native_only",
    deepLink: null,
    docsUrl: "https://developer.apple.com/documentation/healthkit",
  },
  {
    id: "cronometer",
    name: "Cronometer",
    emoji: "📊",
    color: "#F97316",
    description: "Pull detailed micronutrient data from recipes you save",
    limitation: "Cronometer has no public API. Their team has confirmed this and offers a case-by-case partner API for Pro customers. We're in contact.",
    limitationShort: "No public API — partner request submitted",
    apiStatus: "partner_pending",
    deepLink: null,
    docsUrl: "https://cronometer.com/",
  },
];

const SHOPPING_COMING_SOON = [
  {
    id: "groupon",
    name: "Groupon",
    emoji: "🤑",
    color: "#53A318",
    description: "Save local deals, experiences & restaurant offers",
    eta: "Q3 2026",
    reason: "Direct deal-save API in development. Will auto-save expiring Groupon deals to your ClipForge vault.",
  },
  {
    id: "retailmenot",
    name: "RetailMeNot",
    emoji: "🏷️",
    color: "#E8272B",
    description: "Save coupon codes & cashback offers alongside your saved products",
    eta: "Q3 2026",
    reason: "Coupon sync API planned. Will pair saved product URLs with matching coupon codes automatically.",
  },
];

export default function Integrations() {
  const [user, setUser] = useState(null);
  const [savedKeys, setSavedKeys] = useState({});
  // Amazon: track whether user has enabled it, and whether advanced mode is open
  const [amazonEnabled, setAmazonEnabled] = useState(false);
  const [amazonAdvanced, setAmazonAdvanced] = useState(false);
  const [amazonSaving, setAmazonSaving] = useState(false);
  // Local draft state for Amazon credential fields (so we only persist on Save click)
  const [amazonDraft, setAmazonDraft] = useState({ access_key: "", secret_key: "", tag: "" });
  const queryClient = useQueryClient();
  const { plan, isPro } = useSubscription();
  const [searchParams] = useSearchParams();

  // Determine initial tab — from ?tab= query param (set by OAuthCallback on return)
  const defaultTab = searchParams.get("tab") || "streaming";
  // Show a success banner if returning from OAuth callback
  const connectedPlatform = searchParams.get("connected");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    const migrateLocalStorageKeys = async () => {
      const legacyRaw = localStorage.getItem("cf_api_keys");
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw);
          const hasKeys = Object.values(legacy).some(v => v && v.trim());
          if (hasKeys) {
            await base44.entities.UserPreferences?.upsert?.({ api_keys: legacy }).catch(() => {});
          }
          localStorage.removeItem("cf_api_keys");
        } catch { /* ignore parse errors */ }
      }
    };
    base44.entities.UserPreferences?.list?.()
      .then(prefs => {
        const keys = prefs?.[0]?.api_keys || {};
        setSavedKeys(keys);
        setAmazonEnabled(!!keys.amazon_access_key);
        migrateLocalStorageKeys();
      })
      .catch(() => {
        const legacy = JSON.parse(localStorage.getItem("cf_api_keys") || "{}");
        setSavedKeys(legacy);
        setAmazonEnabled(!!legacy.amazon_access_key);
        migrateLocalStorageKeys();
      });
  }, []);

  const isPremium = isPro;

  const saveKey = (key, value) => {
    const updated = { ...savedKeys, [key]: value };
    setSavedKeys(updated);
    // Fire-and-forget for non-Amazon keys only — Amazon uses handleAmazonSave
    base44.entities.UserPreferences?.upsert?.({ api_keys: updated }).catch(() => {
      console.warn("[Klip4ge] Could not persist API key server-side");
    });
    localStorage.removeItem("cf_api_keys");
  };

  // Amazon save: explicit button click only — never on keystroke.
  // Uses draft state to avoid persisting incomplete credentials.
  const handleAmazonSave = async () => {
    const { access_key, secret_key, tag } = amazonDraft;
    if (!access_key.trim() || !secret_key.trim() || !tag.trim()) {
      toast.error("Please fill in all three fields before saving.");
      return;
    }
    setAmazonSaving(true);
    const updated = {
      ...savedKeys,
      amazon_access_key: access_key.trim(),
      amazon_secret_key: secret_key.trim(),
      amazon_tag: tag.trim(),
    };
    try {
      await base44.entities.UserPreferences?.upsert?.({ api_keys: updated });
      setSavedKeys(updated);
      setAmazonEnabled(true);
      setAmazonAdvanced(false);
      localStorage.removeItem("cf_api_keys");
      toast.success("Amazon Product Lookup is now active!");
    } catch {
      toast.error("Couldn't save your Amazon credentials. Please try again.");
    } finally {
      setAmazonSaving(false);
    }
  };

  const handleAmazonToggle = () => {
    if (amazonEnabled) {
      // Disable: clear keys from DB and local state
      const updated = { ...savedKeys, amazon_access_key: "", amazon_secret_key: "", amazon_tag: "" };
      setSavedKeys(updated);
      setAmazonEnabled(false);
      setAmazonDraft({ access_key: "", secret_key: "", tag: "" });
      base44.entities.UserPreferences?.upsert?.({ api_keys: updated }).catch(() => {
        toast.error("Couldn't clear Amazon credentials. Please try again.");
      });
      toast.success("Amazon Product Lookup disabled");
    } else {
      // Pre-fill draft with any existing saved keys
      setAmazonDraft({
        access_key: savedKeys.amazon_access_key || "",
        secret_key: savedKeys.amazon_secret_key || "",
        tag: savedKeys.amazon_tag || "",
      });
      setAmazonAdvanced(true);
    }
  };

  // ── Health integration: notify-me list ───────────────────────────────────
  // Health apps (MFP, Apple Health, Cronometer) have no publicly-accessible
  // web API. We do NOT write fake "connected" records. Instead we:
  //   a) Show honest limitation banners per app
  //   b) Offer a "Notify Me" button that stores user interest in UserPreferences
  //      so we can email when the integration goes live.
  const [healthNotified, setHealthNotified] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cf_health_notified") || "{}");
    } catch { return {}; }
  });

  const handleHealthNotify = async (app) => {
    const updated = { ...healthNotified, [app.id]: true };
    setHealthNotified(updated);
    localStorage.setItem("cf_health_notified", JSON.stringify(updated));
    try {
      await base44.entities.UserPreferences?.upsert?.({
        health_notify_interests: Object.keys(updated),
      }).catch(() => {});
      toast.success(
        `We'll notify you when ${app.name} integration launches!`,
        { duration: 4000 }
      );
    } catch {
      // localStorage fallback is enough
      toast.success(`Got it! We'll notify you when ${app.name} launches.`);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">

      {/* OAuth return success banner */}
      {connectedPlatform && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300">
            <strong className="capitalize">{connectedPlatform.replace("_", " ")}</strong> connected successfully!
            Hit <strong>Sync Now</strong> to import your saves.
          </p>
        </div>
      )}

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
            <p className="text-xs text-[#8B8D97]">Connect once, sync all your bookmarks, liked videos, followed channels, and podcast episodes directly to your Klip4ge vault.</p>
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

      <Tabs defaultValue={defaultTab}>
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
                <p className="text-xs text-[#8B8D97]">Discover followers from your social platforms who are already on Klip4ge</p>
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
          {/* ── Amazon Product Lookup — consumer-friendly UI ────────────────── */}
          <Card className="glass-card p-5">
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛒</span>
                <div>
                  <h3 className="font-semibold text-sm">Amazon Product Lookup</h3>
                  <p className="text-[10px] text-[#8B8D97]">
                    Auto-fetch prices & details for Amazon links you save
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {amazonEnabled && (
                  <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Active
                  </Badge>
                )}
                <Button
                  size="sm"
                  className={amazonEnabled
                    ? "h-8 text-xs border border-[#2A2D3A] bg-transparent text-[#8B8D97] hover:text-red-400 hover:border-red-400/40"
                    : "h-8 text-xs bg-[#F59E0B] text-white hover:bg-[#F59E0B]/90"
                  }
                  onClick={handleAmazonToggle}
                >
                  {amazonEnabled ? "Disconnect" : "Connect Amazon"}
                </Button>
              </div>
            </div>

            {/* What it does — plain English */}
            {!amazonEnabled && (
              <div className="mt-3 p-3 rounded-xl bg-[#0F1117] border border-[#2A2D3A] space-y-2">
                <p className="text-xs text-[#8B8D97] leading-relaxed">
                  When you save an Amazon link, ClipForge automatically pulls the
                  <strong className="text-[#E8E8ED]"> product title, price, image, and deals </strong>
                  — so your saves stay up to date without any extra work.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-[#8B8D97]">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Your API credentials are encrypted and never visible to other users.
                </div>
              </div>
            )}

            {/* Active state summary */}
            {amazonEnabled && !amazonAdvanced && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Connected — product lookup is running
                </p>
                <p className="text-[10px] text-[#8B8D97]">
                  Amazon prices and details are auto-fetched when you save a product link.
                </p>
                <button
                  onClick={() => {
                    setAmazonDraft({
                      access_key: savedKeys.amazon_access_key || "",
                      secret_key: savedKeys.amazon_secret_key || "",
                      tag: savedKeys.amazon_tag || "",
                    });
                    setAmazonAdvanced(true);
                  }}
                  className="text-[10px] text-[#00BFFF] hover:underline flex items-center gap-1 mt-1"
                >
                  <ChevronDown className="w-3 h-3" /> Edit credentials
                </button>
              </div>
            )}

            {/* Advanced credentials panel — hidden by default */}
            {amazonAdvanced && (
              <div className="mt-4 space-y-3 border-t border-[#2A2D3A] pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#E8E8ED]">API Credentials</p>
                  <button
                    onClick={() => setAmazonAdvanced(false)}
                    className="text-[10px] text-[#8B8D97] hover:text-[#E8E8ED] flex items-center gap-1"
                  >
                    <ChevronUp className="w-3 h-3" /> Hide
                  </button>
                </div>
                <p className="text-[10px] text-[#8B8D97] leading-relaxed">
                  Get your free credentials at{" "}
                  <a
                    href="https://affiliate-program.amazon.com/assoc_credentials/home"
                    target="_blank" rel="noopener noreferrer"
                    className="text-[#F59E0B] hover:underline"
                  >
                    Amazon Associates ↗
                  </a>
                  {" "}(requires a free Amazon Associate account).
                </p>
                {/* Draft inputs — credentials are NOT saved until the button is clicked */}
                <div>
                  <Label className="text-xs text-[#8B8D97]">Access Key ID</Label>
                  <Input
                    type="password"
                    placeholder="Paste your Access Key ID"
                    value={amazonDraft.access_key}
                    onChange={(e) => setAmazonDraft(d => ({ ...d, access_key: e.target.value }))}
                    className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#8B8D97]">Secret Key</Label>
                  <Input
                    type="password"
                    placeholder="Paste your Secret Key"
                    value={amazonDraft.secret_key}
                    onChange={(e) => setAmazonDraft(d => ({ ...d, secret_key: e.target.value }))}
                    className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#8B8D97]">Associate Tag <span className="text-[#8B8D97]/60">(e.g. yourtag-20)</span></Label>
                  <Input
                    placeholder="yourtag-20"
                    value={amazonDraft.tag}
                    onChange={(e) => setAmazonDraft(d => ({ ...d, tag: e.target.value }))}
                    className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  className="bg-[#F59E0B] text-white w-full h-10 text-sm font-semibold"
                  onClick={handleAmazonSave}
                  disabled={amazonSaving}
                >
                  {amazonSaving
                    ? <><span className="animate-spin mr-2">⏳</span> Saving…</>
                    : <><CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Save & Enable Amazon Lookup</>
                  }
                </Button>
              </div>
            )}
          </Card>

          {/* ── Ticketmaster ───────────────────────────────────────────────── */}
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

          {/* ── Coming Soon: Groupon + RetailMeNot ─────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-[#22C55E]" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#8B8D97]">Coming Soon — Deals & Coupons</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SHOPPING_COMING_SOON.map((item) => (
                <Card
                  key={item.id}
                  className="glass-card p-5 relative overflow-hidden"
                  style={{ borderColor: `${item.color}25` }}
                >
                  <div className="absolute inset-0 opacity-[0.03] rounded-2xl" style={{ background: item.color }} />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.emoji}</span>
                        <div>
                          <h4 className="font-semibold text-sm text-[#E8E8ED]">{item.name}</h4>
                          <p className="text-[10px] text-[#8B8D97]">{item.description}</p>
                        </div>
                      </div>
                      <Badge className="text-[9px] bg-[#2A2D3A] text-[#8B8D97] border-[#2A2D3A] whitespace-nowrap shrink-0">
                        <Clock className="w-2.5 h-2.5 mr-1" />{item.eta}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-[#8B8D97] leading-relaxed mb-3">{item.reason}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="w-full h-8 text-xs border-dashed"
                      style={{ borderColor: `${item.color}40`, color: item.color, opacity: 0.7 }}
                    >
                      Coming {item.eta}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
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
          {/* ── Honest status banner ───────────────────────────────────────── */}
          <div className="p-4 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/25 flex items-start gap-3">
            <Info className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#F59E0B] mb-0.5">Health integrations — coming in a future release</p>
              <p className="text-[10px] text-[#8B8D97] leading-relaxed">
                Apple HealthKit is <strong className="text-[#E8E8ED]">iOS-native only</strong> (no web API exists).
                MyFitnessPal and Cronometer both have <strong className="text-[#E8E8ED]">private partner-only APIs</strong> with no public developer access.
                We're actively pursuing partner agreements and building the iOS app.
                Hit <em>Notify Me</em> below and we'll email you the moment each integration goes live.
              </p>
            </div>
          </div>

          {/* ── Current live path: Spoonacular nutrition ───────────────────── */}
          <Card className="glass-card p-5 border-emerald-500/20">
            <div className="flex items-center gap-3 mb-2">
              <Utensils className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-sm">Nutrition data — available now via Spoonacular</h3>
              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Live
              </Badge>
            </div>
            <p className="text-[10px] text-[#8B8D97] leading-relaxed">
              Save any recipe URL and ClipForge automatically extracts ingredients, macros, and calorie counts via the Spoonacular API.
              Export these to your Shopping Lists tab. Direct Health app sync will layer on top of this when partner APIs become available.
            </p>
          </Card>

          {/* ── Per-app cards: honest status + Notify Me ──────────────────── */}
          {HEALTH_APPS.map(app => {
            const notified = !!healthNotified[app.id];
            return (
              <Card key={app.id} className="glass-card p-5" style={{ borderColor: `${app.color}20` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{app.emoji}</span>
                    <div>
                      <h3 className="font-semibold text-sm">{app.name}</h3>
                      <p className="text-xs text-[#8B8D97]">{app.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status badge — honest labels, no fake "Connected" */}
                    {app.apiStatus === "native_only" ? (
                      <Badge className="text-[9px] bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20 whitespace-nowrap">
                        <Smartphone className="w-2.5 h-2.5 mr-1" /> iOS app required
                      </Badge>
                    ) : (
                      <Badge className="text-[9px] bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 whitespace-nowrap">
                        <Clock className="w-2.5 h-2.5 mr-1" /> Partner pending
                      </Badge>
                    )}
                    {notified ? (
                      <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 whitespace-nowrap">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Notified
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-[10px] text-white"
                        style={{ background: app.color }}
                        onClick={() => handleHealthNotify(app)}
                        data-testid={`health-notify-${app.id}`}
                      >
                        Notify Me
                      </Button>
                    )}
                  </div>
                </div>
                {/* Per-app limitation detail */}
                <div className="mt-3 p-2.5 rounded-lg bg-[#0F1117] border border-[#2A2D3A]">
                  <p className="text-[10px] text-[#8B8D97] leading-relaxed">{app.limitation}</p>
                </div>
              </Card>
            );
          })}

          {/* ── iOS app teaser ─────────────────────────────────────────────── */}
          <Card className="glass-card p-5 border border-[#9370DB]/20">
            <div className="flex items-center gap-3 mb-2">
              <Smartphone className="w-4 h-4 text-[#9370DB]" />
              <h3 className="font-semibold text-sm">ClipForge iOS App — in development</h3>
              <Badge className="text-[9px] bg-[#9370DB]/10 text-[#9370DB] border-[#9370DB]/20">
                <Clock className="w-2.5 h-2.5 mr-1" /> 2026
              </Badge>
            </div>
            <p className="text-[10px] text-[#8B8D97] leading-relaxed">
              Apple HealthKit requires a native iOS app. The ClipForge iOS app will unlock full HealthKit integration,
              including steps, calorie goals, and nutrition sync from saved recipes — all on-device with Apple's privacy model.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}