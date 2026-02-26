import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Share2, Users, Globe, Lock, UserCheck, Crown, Zap, Copy, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

// Tier definitions
const TIER_CONFIG = {
  free: {
    label: "Free",
    color: "#8B8D97",
    canShare: ["basic"],
    maxFriends: 5,
    hasAds: true,
    description: "Share basic saves (title + link). Ads shown on shared page.",
  },
  pro: {
    label: "Pro",
    color: "#00BFFF",
    canShare: ["basic", "trends", "summaries"],
    maxFriends: 20,
    hasAds: false,
    description: "Share saves with AI summaries & trend data. Ad-free shares.",
  },
  premium: {
    label: "Premium",
    color: "#9370DB",
    canShare: ["basic", "trends", "summaries"],
    maxFriends: 20,
    hasAds: false,
    description: "Full saves with AI summaries & trend analytics. Ad-free.",
  },
  family: {
    label: "Family",
    color: "#FFB6C1",
    canShare: ["basic", "trends", "summaries", "family_deep"],
    maxFriends: 999,
    hasAds: false,
    description: "Unlimited sharing including deep family boards and child-safe shares.",
  },
};

const SHARE_LEVEL_OPTIONS = [
  {
    id: "private",
    label: "Just Me",
    icon: Lock,
    color: "#8B8D97",
    description: "Only you can see this",
    minPlan: "free",
  },
  {
    id: "friends",
    label: "Friends",
    icon: Users,
    color: "#00BFFF",
    description: "Share with your connected friends",
    minPlan: "free",
  },
  {
    id: "family",
    label: "Family",
    icon: Crown,
    color: "#FFB6C1",
    description: "Share with your family group",
    minPlan: "family",
  },
  {
    id: "public",
    label: "Public",
    icon: Globe,
    color: "#10B981",
    description: "Anyone with the link can view",
    minPlan: "pro",
  },
];

const PLAN_ORDER = ["free", "pro", "premium", "family"];
const planLevel = (p) => PLAN_ORDER.indexOf(p);

export default function ShareModal({ open, onOpenChange, item, type = "save", plan = "free", user }) {
  const [level, setLevel] = useState("friends");
  const [includeAi, setIncludeAi] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [copied, setCopied] = useState(false);

  const tierCfg = TIER_CONFIG[plan] || TIER_CONFIG.free;
  const canAi = tierCfg.canShare.includes("summaries");
  const canFamily = tierCfg.canShare.includes("family_deep");

  const { data: friends = [] } = useQuery({
    queryKey: ["friends_sent", user?.email],
    queryFn: () => base44.entities.FriendConnection.filter({ requester_email: user.email, status: "accepted" }),
    enabled: !!user?.email && open,
  });

  const toggleFriend = (email) => {
    setSelectedFriends(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleShare = async () => {
    const shareData = {
      item_id: item?.id,
      type,
      level,
      include_ai: includeAi && canAi,
      shared_with: level === "friends" ? selectedFriends : [],
      plan_tier: plan,
      has_ads: tierCfg.hasAds,
    };

    // Update item's shared_with field if sharing with specific friends
    if (level === "friends" && selectedFriends.length > 0 && item?.id) {
      await base44.entities.SavedItem.update(item.id, {
        shared_with: selectedFriends,
      });
    }

    toast.success(`Shared ${level === "public" ? "publicly" : `with ${level}`}!`);
    onOpenChange(false);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/share/${item?.id || "preview"}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied!");
    });
  };

  const isLevelAvailable = (opt) => {
    if (opt.minPlan === "free") return true;
    if (opt.minPlan === "family") return plan === "family";
    if (opt.minPlan === "pro") return planLevel(plan) >= planLevel("pro");
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#00BFFF]" /> Share {type === "save" ? "Save" : type === "analytics" ? "Analytics" : "Item"}
          </DialogTitle>
        </DialogHeader>

        {/* Item preview */}
        {item && (
          <div className="p-3 rounded-xl bg-[#0F1117] border border-[#2A2D3A] flex items-start gap-3">
            {item.image_url && (
              <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{item.title || "Untitled"}</p>
              <p className="text-[10px] text-[#8B8D97] truncate">{item.description || ""}</p>
            </div>
          </div>
        )}

        {/* Plan tier badge */}
        <div className="flex items-center gap-2 text-xs" style={{ color: tierCfg.color }}>
          <Crown className="w-3 h-3" />
          <span className="font-semibold">{tierCfg.label} Plan</span>
          <span className="text-[#8B8D97]">— {tierCfg.description}</span>
        </div>

        {/* Privacy selector */}
        <div className="space-y-2">
          <p className="text-xs text-[#8B8D97] font-semibold uppercase tracking-wide">Who can see this?</p>
          <div className="grid grid-cols-2 gap-2">
            {SHARE_LEVEL_OPTIONS.map(opt => {
              const available = isLevelAvailable(opt);
              const Icon = opt.icon;
              const active = level === opt.id;
              return (
                <button
                  key={opt.id}
                  disabled={!available}
                  onClick={() => available && setLevel(opt.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active
                      ? "border-opacity-60 bg-opacity-10"
                      : "border-[#2A2D3A] opacity-60 hover:opacity-80"
                  } ${!available ? "opacity-40 cursor-not-allowed" : ""}`}
                  style={active ? { borderColor: opt.color, background: `${opt.color}10` } : {}}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5" style={{ color: opt.color }} />
                    <span className="text-xs font-semibold">{opt.label}</span>
                    {!available && (
                      <Badge variant="outline" className="text-[8px] border-[#9370DB]/30 text-[#9370DB] ml-auto">
                        {opt.minPlan === "family" ? "Family" : "Pro+"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-[#8B8D97]">{opt.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Friend selector (when "friends" selected) */}
        {level === "friends" && friends.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[#8B8D97] font-semibold uppercase tracking-wide">
              Select Friends ({selectedFriends.length} selected)
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1.5">
              {friends.map(f => {
                const email = f.recipient_email;
                const sel = selectedFriends.includes(email);
                return (
                  <button key={f.id} onClick={() => toggleFriend(email)}
                    className={`w-full p-2.5 rounded-lg border flex items-center gap-2.5 transition-all text-left ${
                      sel ? "border-[#00BFFF]/40 bg-[#00BFFF]/5" : "border-[#2A2D3A] hover:border-[#2A2D3A]/80"
                    }`}>
                    <div className="w-7 h-7 rounded-full bg-[#00BFFF]/15 flex items-center justify-center text-xs text-[#00BFFF] shrink-0">
                      {(f.recipient_name || email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{f.recipient_name || email}</p>
                      <p className="text-[9px] text-[#8B8D97] truncate">{email}</p>
                    </div>
                    {sel && <CheckCircle2 className="w-3.5 h-3.5 text-[#00BFFF] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {level === "friends" && friends.length === 0 && (
          <p className="text-xs text-[#8B8D97] text-center py-2">
            No connected friends yet. Add friends in Settings!
          </p>
        )}

        {/* AI summary toggle */}
        <div className={`flex items-center justify-between p-3 rounded-xl border ${canAi ? "border-[#9370DB]/20 bg-[#9370DB]/5" : "border-[#2A2D3A] opacity-50"}`}>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#9370DB]" />
            <div>
              <p className="text-xs font-semibold">Include AI Summary & Trends</p>
              <p className="text-[10px] text-[#8B8D97]">{canAi ? "Available on your plan" : "Requires Pro or higher"}</p>
            </div>
          </div>
          <button
            disabled={!canAi}
            onClick={() => canAi && setIncludeAi(v => !v)}
            className={`w-10 h-5 rounded-full transition-all ${includeAi && canAi ? "bg-[#9370DB]" : "bg-[#2A2D3A]"}`}
          >
            <span className={`block w-4 h-4 rounded-full bg-white mx-0.5 transition-transform ${includeAi && canAi ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        {/* Ads notice */}
        {tierCfg.hasAds && (
          <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-[10px] text-amber-400">
              ℹ️ Free plan: shared pages include ClipForge ads. <a href="/Pricing" className="underline">Upgrade to Pro</a> for ad-free shares.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleCopyLink}
            className="border-[#2A2D3A] text-[#E8E8ED] gap-1.5 text-xs">
            {copied ? <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Link</>}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-[#8B8D97]">Cancel</Button>
          <Button size="sm" onClick={handleShare}
            className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}