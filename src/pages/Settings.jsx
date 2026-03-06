import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Bell, LogOut, Save, Users, UserPlus, Gift, Lock, ArrowRight, Crown, Plug, Trash2, Download, Shield, X, PlayCircle, Eye, EyeOff, MessageCircle, MessageSquarePlus, ShoppingBag, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TierGate from "@/components/shared/TierGate";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/components/shared/useSubscription";
import FamilyManagement from "@/components/family/FamilyManagement";
import FamilyUpgradePrompt from "@/components/family/FamilyUpgradePrompt";
import FriendsPanel from "@/components/friends/FriendsPanel";
import ReferralPanel from "@/components/referral/ReferralPanel";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { useOnboarding } from "@/hooks/useOnboarding";
import { SUPPORT_BOT_DISMISSED_KEY } from "@/components/support/SupportBot";
import { BETA_WIDGET_DISMISSED_KEY } from "@/components/shared/BetaFeedbackWidget";

export default function Settings() {
  const [user, setUser] = useState(null);
  const { isFamily, isPro, plan } = useSubscription();
  const [preferences, setPreferences] = useState({
    notifications_enabled: true,
    email_digests: true,
    dark_mode: true,
  });
  // Bubble visibility — read from localStorage so they persist across renders
  const [supportBotHidden, setSupportBotHidden] = useState(
    () => localStorage.getItem(SUPPORT_BOT_DISMISSED_KEY) === "true"
  );
  const [betaWidgetHidden, setBetaWidgetHidden] = useState(
    () => localStorage.getItem(BETA_WIDGET_DISMISSED_KEY) === "true"
  );
  const [dataModalOpen, setDataModalOpen] = useState(null); // 'delete' | 'export' | null

  // ── Market Savings preferences ─────────────────────────────────────────────
  const MARKET_PREFS_KEY = "cf_market_prefs";
  const defaultMarketPrefs = { enabled: false, types: [], radius: "50", city: "" };
  const [marketPrefs, setMarketPrefs] = useState(() => {
    try { return { ...defaultMarketPrefs, ...JSON.parse(localStorage.getItem(MARKET_PREFS_KEY) || "{}") }; }
    catch { return defaultMarketPrefs; }
  });
  const saveMarketPrefs = (updated) => {
    setMarketPrefs(updated);
    localStorage.setItem(MARKET_PREFS_KEY, JSON.stringify(updated));
    toast.success("Market Savings preferences saved");
  };
  const toggleMarketType = (type) => {
    const cur = marketPrefs.types || [];
    const next = cur.includes(type) ? cur.filter(t => t !== type) : [...cur, type];
    saveMarketPrefs({ ...marketPrefs, types: next });
  };
  const [dataReason, setDataReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Onboarding settings
  const onboarding = useOnboarding(user?.email);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u.preferences) setPreferences(u.preferences);
    }).catch(() => {});
  }, []);

  const savePreferences = async () => {
    await base44.auth.updateMe({ preferences });
    toast.success("Settings saved");
  };

  const submitDataRequest = async (type) => {
    setSubmitting(true);
    const isDelete = type === "delete";
    await base44.entities.SupportTicket.create({
      subject: isDelete ? "Account Deletion Request (Right to Erasure)" : "Data Export Request (Right to Portability)",
      message: `${isDelete
        ? "I am requesting permanent deletion of my account and all associated personal data under GDPR Article 17 / CCPA Right to Erasure."
        : "I am requesting an export of all personal data associated with my account under GDPR Article 20 / CCPA Right to Know."
      }\n\nUser email: ${user?.email}\nReason: ${dataReason || "Not specified"}\n\nPlease process this request within 30 days as required by applicable law.`,
      category: "account",
      priority: isDelete ? "high" : "medium",
    });
    setSubmitting(false);
    setDataModalOpen(null);
    setDataReason("");
    toast.success(isDelete
      ? "Deletion request submitted. We'll process it within 30 days."
      : "Export request submitted. We'll email you a download link within 30 days."
    );
  };

  // ── Instant client-side JSON/CSV export (no waiting for server) ─────────
  const exportSavesNow = async (format = "json") => {
    try {
      const items = await base44.entities.SavedItem.list("-created_date");
      if (!items?.length) { toast.error("No saves to export."); return; }

      let content, mimeType, extension;

      if (format === "csv") {
        const headers = ["id","title","url","category","source","tags","description","ai_summary","is_favorite","rating","created_date"];
        const rows = items.map(i => headers.map(h => {
          const v = h === "tags" ? (i.tags || []).join("|") : (i[h] ?? "");
          return `"${String(v).replace(/"/g, '""')}"`;
        }).join(","));
        content = [headers.join(","), ...rows].join("\n");
        mimeType = "text/csv";
        extension = "csv";
      } else {
        content = JSON.stringify({ exported_at: new Date().toISOString(), user: user?.email, count: items.length, saves: items }, null, 2);
        mimeType = "application/json";
        extension = "json";
      }

      const blob = new Blob([content], { type: mimeType });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `klip4ge-saves-${new Date().toISOString().slice(0,10)}.${extension}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      toast.success(`Exported ${items.length} saves as ${extension.toUpperCase()}`);
    } catch {
      toast.error("Export failed. Please try again.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-xs text-[#8B8D97] mt-0.5">Manage your account, preferences, and connections</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs capitalize"
            style={{ borderColor: plan === "free" ? "#8B8D97" : plan === "pro" ? "#00BFFF" : plan === "premium" ? "#9370DB" : "#EC4899",
              color: plan === "free" ? "#8B8D97" : plan === "pro" ? "#00BFFF" : plan === "premium" ? "#9370DB" : "#EC4899" }}>
            {plan} plan
          </Badge>
          {!isPro && (
            <Link to={createPageUrl("Pricing")}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[#9370DB]/40 text-[#9370DB] hover:bg-[#9370DB]/10 transition-all">
                <Crown className="w-3 h-3" /> Upgrade
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Profile */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-[#00BFFF]" />
          <h2 className="font-semibold">Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-[#8B8D97]">Name</Label>
            <Input value={user?.full_name || ""} disabled className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]" />
          </div>
          <div>
            <Label className="text-xs text-[#8B8D97]">Email</Label>
            <Input value={user?.email || ""} disabled className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]" />
          </div>
        </div>
      </Card>

      {/* Market Savings */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <ShoppingBag className="w-5 h-5 text-[#10B981]" />
          <div>
            <h2 className="font-semibold">Market Savings &amp; Deal Suggestions</h2>
            <p className="text-[10px] text-[#8B8D97]">Control when and how deal recommendations appear</p>
          </div>
        </div>
        <div className="space-y-4">
          {/* Master toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Enable Market Savings suggestions</p>
              <p className="text-xs text-[#8B8D97]">Show deal &amp; event recommendations in your Integrations page</p>
            </div>
            <Switch
              checked={marketPrefs.enabled}
              onCheckedChange={(v) => saveMarketPrefs({ ...marketPrefs, enabled: v })}
            />
          </div>

          {marketPrefs.enabled && (
            <div className="space-y-4 border-t border-[#2A2D3A] pt-4">
              {/* City input */}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#8B8D97] shrink-0" />
                <div className="flex-1">
                  <Label className="text-xs text-[#8B8D97]">Your City (for local events &amp; deals)</Label>
                  <Input
                    placeholder="e.g. Denver, CO"
                    value={marketPrefs.city}
                    onChange={(e) => setMarketPrefs(p => ({ ...p, city: e.target.value }))}
                    onBlur={() => saveMarketPrefs(marketPrefs)}
                    className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] h-9 text-sm"
                  />
                </div>
              </div>

              {/* Radius */}
              <div>
                <Label className="text-xs text-[#8B8D97]">Search Radius</Label>
                <Select
                  value={marketPrefs.radius}
                  onValueChange={(v) => saveMarketPrefs({ ...marketPrefs, radius: v })}
                >
                  <SelectTrigger className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                    {[["10","Within 10 miles"],["25","Within 25 miles"],["50","Within 50 miles"],["100","Within 100 miles"],["250","Within 250 miles"]].map(([v,l]) => (
                      <SelectItem key={v} value={v} className="text-[#E8E8ED] hover:bg-[#2A2D3A]">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content type filter chips */}
              <div>
                <Label className="text-xs text-[#8B8D97] block mb-2">Show suggestions for (pick all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "deals", label: "🏷️ Deals & Coupons" },
                    { id: "events", label: "🎟️ Events & Concerts" },
                    { id: "restaurants", label: "🍽️ Food & Dining" },
                    { id: "travel", label: "✈️ Travel & Hotels" },
                    { id: "products", label: "📦 Products" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => toggleMarketType(id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        (marketPrefs.types || []).includes(id)
                          ? "bg-[#10B981]/15 border-[#10B981]/50 text-[#10B981]"
                          : "bg-[#1A1D27] border-[#2A2D3A] text-[#8B8D97] hover:border-[#10B981]/30"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {(marketPrefs.types || []).length === 0 && (
                  <p className="text-[10px] text-[#8B8D97]/60 mt-1.5">No types selected — all categories will show</p>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Notifications */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-[#9370DB]" />
          <h2 className="font-semibold">Notifications</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Push Notifications</p>
              <p className="text-xs text-[#8B8D97]">Get notified about reminders and shares</p>
            </div>
            <Switch
              checked={preferences.notifications_enabled}
              onCheckedChange={(v) => setPreferences(p => ({ ...p, notifications_enabled: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Email Digests</p>
              <p className="text-xs text-[#8B8D97]">Weekly summary of your saves and trends</p>
            </div>
            <Switch
              checked={preferences.email_digests}
              onCheckedChange={(v) => setPreferences(p => ({ ...p, email_digests: v }))}
            />
          </div>
        </div>
      </Card>

      {/* Onboarding Videos */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <PlayCircle className="w-5 h-5 text-[#00BFFF]" />
          <div>
            <h2 className="font-semibold">Onboarding &amp; Walkthroughs</h2>
            <p className="text-[10px] text-[#8B8D97]">Control feature tour videos and replays</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Show walkthrough videos</p>
              <p className="text-xs text-[#8B8D97]">Auto-play feature tours on first visit to each page</p>
            </div>
            <Switch
              checked={onboarding.videosEnabled}
              onCheckedChange={(v) => {
                onboarding.setVideosEnabled(v);
                toast.success(v ? "Walkthrough videos enabled" : "Walkthrough videos disabled");
              }}
            />
          </div>
          <div className="pt-2 border-t border-[#2A2D3A]">
            <p className="text-xs text-[#8B8D97] mb-3">
              Want to replay the full feature tour? Reset your progress and it will show again on your next visit.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-[#2A2D3A] text-[#8B8D97] hover:text-[#E8E8ED] text-xs"
              onClick={() => {
                onboarding.resetAll();
                toast.success("Onboarding tour reset — it will play again on your next visit!");
              }}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Replay full tour
            </Button>
          </div>
        </div>
      </Card>

      {/* Bubbles & Widgets */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <Eye className="w-5 h-5 text-[#00BFFF]" />
          <div>
            <h2 className="font-semibold">Bubbles &amp; Widgets</h2>
            <p className="text-[10px] text-[#8B8D97]">Show or hide floating UI elements</p>
          </div>
        </div>
        <div className="space-y-4">
          {/* Support Bot bubble */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#00BFFF]" />
              <div>
                <p className="text-sm">AI Support Chat</p>
                <p className="text-xs text-[#8B8D97]">Floating help bubble (bottom-right)</p>
              </div>
            </div>
            <Switch
              checked={!supportBotHidden}
              onCheckedChange={(v) => {
                if (v) {
                  localStorage.removeItem(SUPPORT_BOT_DISMISSED_KEY);
                  setSupportBotHidden(false);
                  toast.success("Support chat restored — refresh the page to see it.");
                } else {
                  localStorage.setItem(SUPPORT_BOT_DISMISSED_KEY, "true");
                  setSupportBotHidden(true);
                  toast("Support chat hidden.");
                }
              }}
            />
          </div>
          {/* Beta Feedback bubble — only relevant to beta/admin users */}
          {(user?.role === "admin" || user?.role === "beta") && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4 text-[#9370DB]" />
                <div>
                  <p className="text-sm">Beta Feedback Button</p>
                  <p className="text-xs text-[#8B8D97]">Floating feedback bubble (bottom-left)</p>
                </div>
              </div>
              <Switch
                checked={!betaWidgetHidden}
                onCheckedChange={(v) => {
                  if (v) {
                    localStorage.removeItem(BETA_WIDGET_DISMISSED_KEY);
                    setBetaWidgetHidden(false);
                    toast.success("Feedback bubble restored — refresh the page to see it.");
                  } else {
                    localStorage.setItem(BETA_WIDGET_DISMISSED_KEY, "true");
                    setBetaWidgetHidden(true);
                    toast("Feedback bubble hidden.");
                  }
                }}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Friends & Connections */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <UserPlus className="w-5 h-5 text-[#00BFFF]" />
          <div>
            <h2 className="font-semibold">Friends & Connections</h2>
            <p className="text-[10px] text-[#8B8D97]">Manage friends, invites & sharing permissions</p>
          </div>
        </div>
        {isPro ? (
          <FriendsPanel user={user} plan={plan} />
        ) : (
          <TierGate required="pro" currentTier={plan} feature="Friends & social sharing" compact />
        )}
      </Card>

      {/* Referrals */}
      <Card className="glass-card p-6 border border-[#FFB6C1]/20">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 text-[#FFB6C1]" />
            <div>
              <h2 className="font-semibold">Refer a Friend</h2>
              <p className="text-[10px] text-[#8B8D97]">Earn 1 free month or $5 credit per converted referral</p>
            </div>
          </div>
          <Link to={createPageUrl("Pricing") + "#referral"}>
            <button className="text-[10px] px-3 py-1.5 rounded-full border border-[#FFB6C1]/30 text-[#FFB6C1] hover:bg-[#FFB6C1]/8 transition-all">
              View rewards →
            </button>
          </Link>
        </div>
        <ReferralPanel user={user} />
        {!isPro && (
          <div className="mt-4 p-3 rounded-xl bg-[#9370DB]/8 border border-[#9370DB]/20 text-xs text-[#8B8D97]">
            💡 <strong className="text-[#9370DB]">Pro tip:</strong> Upgrade to Pro to unlock the full referral dashboard, track bonuses, and share to friends.
            {" "}<Link to={createPageUrl("Pricing")} className="text-[#9370DB] hover:underline">Upgrade →</Link>
          </div>
        )}
      </Card>

      {/* Integrations shortcut */}
      <Card className="glass-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <Plug className="w-5 h-5 text-[#9370DB]" />
          <div>
            <h2 className="font-semibold">Platform Integrations</h2>
            <p className="text-[10px] text-[#8B8D97]">Connect Discord, Twitch, YouTube, Spotify & more</p>
          </div>
        </div>
        <Link to={createPageUrl("Integrations")}>
          <Button size="sm" className="bg-[#9370DB]/15 border border-[#9370DB]/30 text-[#9370DB] hover:bg-[#9370DB]/25 gap-1.5 text-xs">
            Manage Integrations <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </Card>

      {/* Family Accounts */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <Users className="w-5 h-5 text-[#EC4899]" />
          <div>
            <h2 className="font-semibold">Family Accounts</h2>
            <p className="text-[10px] text-[#8B8D97]">Manage family members, roles & parental controls</p>
          </div>
        </div>
        {isFamily ? (
          <FamilyManagement user={user} />
        ) : (
          <TierGate required="family" currentTier={plan} feature="Family accounts & parental controls" compact />
        )}
      </Card>

      {/* Privacy & Data Rights */}
      <Card className="glass-card p-6 border border-[#EF4444]/20">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-[#EF4444]" />
          <div>
            <h2 className="font-semibold">Privacy & Data Rights</h2>
            <p className="text-[10px] text-[#8B8D97]">GDPR / CCPA — your data, your rights</p>
          </div>
        </div>
        <p className="text-xs text-[#8B8D97] mb-4 leading-relaxed">
          Under GDPR (Article 17) and CCPA, you have the right to request deletion or export of all personal data we hold about you. Requests are processed within 30 days.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-[#00BFFF]/30 text-[#00BFFF] hover:bg-[#00BFFF]/10 gap-1.5 text-xs"
            onClick={() => setDataModalOpen("export")}
          >
            <Download className="w-3.5 h-3.5" /> Export My Data
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/10 gap-1.5 text-xs"
            onClick={() => setDataModalOpen("delete")}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete My Data & Account
          </Button>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={savePreferences} className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-2">
          <Save className="w-4 h-4" /> Save Settings
        </Button>
        <Button variant="outline" className="border-[#2A2D3A] text-[#E8E8ED] gap-2" onClick={() => base44.auth.logout()}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>

      {/* Data Request Modal */}
      {dataModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1A1D27] border border-[#2A2D3A] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dataModalOpen === "delete" ? "bg-[#EF4444]/15" : "bg-[#00BFFF]/15"}`}>
                  {dataModalOpen === "delete"
                    ? <Trash2 className="w-4 h-4 text-[#EF4444]" />
                    : <Download className="w-4 h-4 text-[#00BFFF]" />
                  }
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {dataModalOpen === "delete" ? "Request Account Deletion" : "Request Data Export"}
                  </h3>
                  <p className="text-[10px] text-[#8B8D97]">
                    {dataModalOpen === "delete" ? "GDPR Art. 17 · CCPA Right to Erasure" : "GDPR Art. 20 · CCPA Right to Know"}
                  </p>
                </div>
              </div>
              <button onClick={() => setDataModalOpen(null)} className="text-[#8B8D97] hover:text-[#E8E8ED]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#8B8D97] leading-relaxed">
              {dataModalOpen === "delete"
                ? "This will submit a support ticket requesting permanent deletion of your account and all associated personal data. A team member will confirm and process your request within 30 days."
                : "This will submit a support ticket requesting a full export of your personal data in JSON format. We'll email you a secure download link within 30 days."
              }
            </p>

            <div>
              <Label className="text-xs text-[#8B8D97] mb-1 block">Reason (optional)</Label>
              <Input
                placeholder={dataModalOpen === "delete" ? "e.g. No longer using the service" : "e.g. Backup my data"}
                value={dataReason}
                onChange={e => setDataReason(e.target.value)}
                className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] text-sm"
              />
            </div>

            {dataModalOpen === "delete" && (
              <div className="p-3 rounded-xl bg-[#EF4444]/8 border border-[#EF4444]/20 text-xs text-[#EF4444]">
                ⚠️ Deletion is permanent and cannot be undone. Your subscription will be cancelled and all saved content removed.
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className={`flex-1 gap-2 text-xs ${dataModalOpen === "delete" ? "bg-[#EF4444] hover:bg-[#EF4444]/90 text-white" : "bg-[#00BFFF] hover:bg-[#00BFFF]/90 text-black font-bold"}`}
                onClick={() => submitDataRequest(dataModalOpen)}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : dataModalOpen === "delete" ? "Submit Deletion Request" : "Submit Export Request"}
              </Button>
              <Button variant="outline" className="border-[#2A2D3A] text-[#8B8D97]" onClick={() => setDataModalOpen(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}