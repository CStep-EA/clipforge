import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Share2, Users, Lock, Globe, Zap, Crown, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

// what each plan can share
const SHARE_OPTIONS = {
  free: ["link"],
  pro: ["link", "saves", "trends"],
  premium: ["link", "saves", "trends", "deep_research"],
  family: ["link", "saves", "trends", "deep_research", "family_boards"],
};

const OPTION_LABELS = {
  link: { label: "Link only", icon: Globe, desc: "Share a public link" },
  saves: { label: "My Saves", icon: Zap, desc: "Share your full saves list" },
  trends: { label: "Trends & Analytics", icon: Zap, desc: "Share your analytics summary" },
  deep_research: { label: "Deep Research", icon: Crown, desc: "Include AI deep-dive summaries" },
  family_boards: { label: "Family Boards", icon: Users, desc: "Share family-specific boards" },
};

export default function ShareWithFriendsModal({ open, onClose, item, plan = "free", user }) {
  const [selected, setSelected] = useState(["link"]);
  const [audience, setAudience] = useState("friends"); // friends | public
  const [showAdWarning, setShowAdWarning] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: connections = [] } = useQuery({
    queryKey: ["friends_sent", user?.email],
    queryFn: () => base44.entities.FriendConnection.filter({ requester_email: user.email, status: "accepted" }),
    enabled: !!user?.email && open,
  });

  const allowed = SHARE_OPTIONS[plan] ?? SHARE_OPTIONS.free;

  const toggle = (opt) => {
    if (!allowed.includes(opt)) return;
    setSelected(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]);
  };

  const handleShare = () => {
    if (plan === "free") {
      setShowAdWarning(true);
      return;
    }
    doShare();
  };

  const doShare = () => {
    const shareUrl = `${window.location.origin}/shared/${item?.id || "item"}`;
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    toast.success("Share link copied to clipboard!");
    setTimeout(() => { setCopied(false); onClose(); }, 1500);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] max-w-md">
          <DialogHeader>
            <DialogTitle className="gradient-text flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Share {item?.title ? `"${item.title}"` : "this"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Audience */}
            <div>
              <p className="text-xs text-[#8B8D97] mb-2">Who can see this?</p>
              <div className="flex gap-2">
                {[
                  { id: "friends", label: `Friends (${connections.length})`, icon: Users },
                  { id: "public", label: "Public link", icon: Globe },
                ].map(a => (
                  <button key={a.id} onClick={() => setAudience(a.id)}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${audience === a.id ? "border-[#00BFFF]/50 bg-[#00BFFF]/10 text-[#00BFFF]" : "border-[#2A2D3A] text-[#8B8D97] hover:border-[#00BFFF]/25"}`}>
                    <a.icon className="w-3 h-3" /> {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Share options */}
            <div>
              <p className="text-xs text-[#8B8D97] mb-2">Include in share</p>
              <div className="space-y-2">
                {Object.entries(OPTION_LABELS).map(([key, opt]) => {
                  const locked = !allowed.includes(key);
                  const Icon = opt.icon;
                  return (
                    <div key={key}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${locked ? "border-[#2A2D3A] opacity-50" : selected.includes(key) ? "border-[#00BFFF]/30 bg-[#00BFFF]/5" : "border-[#2A2D3A] hover:border-[#00BFFF]/20 cursor-pointer"}`}
                      onClick={() => !locked && toggle(key)}>
                      <Checkbox checked={selected.includes(key) && !locked} disabled={locked}
                        className="border-[#2A2D3A]" />
                      <Icon className="w-3.5 h-3.5 text-[#8B8D97] flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-medium">{opt.label}</p>
                        <p className="text-[9px] text-[#8B8D97]">{opt.desc}</p>
                      </div>
                      {locked && (
                        <Lock className="w-3 h-3 text-[#8B8D97]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {plan === "free" && (
              <div className="p-3 rounded-xl bg-amber-400/8 border border-amber-400/20 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400">Free shares include ads in the shared view. <Link to={createPageUrl("Pricing")} className="underline font-semibold">Upgrade</Link> for ad-free sharing + more options.</p>
              </div>
            )}

            {!allowed.includes("trends") && (
              <div className="text-center">
                <Link to={createPageUrl("Pricing")}>
                  <Button size="sm" variant="outline" className="border-[#9370DB]/40 text-[#9370DB] text-xs gap-1.5">
                    <Crown className="w-3 h-3" /> Upgrade for more share options
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose} className="text-[#8B8D97]">Cancel</Button>
            <Button onClick={handleShare}
              className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-1.5">
              <Share2 className="w-3.5 h-3.5" /> {copied ? "Copied!" : "Copy Share Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ad warning for free */}
      <Dialog open={showAdWarning} onOpenChange={setShowAdWarning}>
        <DialogContent className="bg-[#1A1D27] border-amber-400/30 text-[#E8E8ED] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Ads will appear in shared view
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#C0C2CC]">
            Free tier shared links include ads for the recipient. <Link to={createPageUrl("Pricing")} className="text-[#00BFFF] underline">Upgrade to Pro</Link> for ad-free sharing.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdWarning(false)} className="text-[#8B8D97]">Cancel</Button>
            <Button onClick={() => { setShowAdWarning(false); doShare(); }} className="bg-amber-500 text-white">
              Share Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}