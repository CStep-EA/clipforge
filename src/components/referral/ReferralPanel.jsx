import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Check, ExternalLink, Zap, Star, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Deterministic code from email
const makeCode = (email) => btoa(email).replace(/[^A-Z0-9]/gi, "").substring(0, 8).toUpperCase();

export default function ReferralPanel({ user }) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const qc = useQueryClient();

  const referralCode = user?.email ? makeCode(user.email) : "";
  const referralLink = referralCode ? `${window.location.origin}?ref=${referralCode}` : "";

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["referrals", user?.email],
    queryFn: () => base44.entities.Referral.filter({ referrer_email: user.email }),
    enabled: !!user?.email,
  });

  // Ensure referral code is seeded in DB for this user
  const { data: myReferralRecord = [] } = useQuery({
    queryKey: ["myReferralRecord", user?.email],
    queryFn: async () => {
      const existing = await base44.entities.Referral.filter({
        referrer_email: user.email,
        referral_code: referralCode,
      });
      if (existing.length === 0) {
        // seed the referral code record (no referred_email yet)
        await base44.entities.Referral.create({
          referrer_email: user.email,
          referral_code: referralCode,
          status: "pending",
          bonus_type: "none",
        }).catch(() => {});
      }
      return existing;
    },
    enabled: !!user?.email && !!referralCode,
    staleTime: Infinity,
  });

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied!");
  }, [referralCode]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    toast.success("Referral link copied!");
  }, [referralLink]);

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    try {
      const result = await base44.functions.invoke("referralRedeemRateLimited", {
        referralCode: redeemCode.trim().toUpperCase(),
      });
      if (result.data?.success) {
        toast.success("Referral code applied! Your friend will earn a bonus when you subscribe.");
        setRedeemCode("");
        qc.invalidateQueries({ queryKey: ["referrals"] });
      } else {
        toast.error(result.data?.error || "Invalid referral code");
      }
    } catch (err) {
      // Check for rate limit errors
      if (err.response?.status === 429) {
        toast.error("Slow down – you've reached the daily redemption limit.");
      } else {
        toast.error("Could not apply code");
      }
    } finally {
      setRedeeming(false);
    }
  };

  // Stats
  const pending   = referrals.filter(r => r.status === "pending" && r.referred_email).length;
  const signedUp  = referrals.filter(r => r.status === "signed_up").length;
  const subscribed= referrals.filter(r => r.status === "subscribed" || r.status === "rewarded").length;
  const freeMonths= referrals.filter(r => r.bonus_type === "free_month" && r.status === "rewarded").length;
  const credits   = referrals.filter(r => r.bonus_type === "credit_5"  && r.status === "rewarded").length;

  const recentReferrals = referrals.filter(r => r.referred_email).slice(-6);

  return (
    <div className="space-y-5">
      {/* ── Referral link & code ─────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[#8B8D97] uppercase tracking-wider">Your Referral Code</p>
        <div className="flex gap-2">
          <div className="flex-1 font-mono text-lg font-bold text-[#00BFFF] bg-[#0F1117] border border-[#00BFFF]/25 rounded-xl px-4 py-3 select-all tracking-widest">
            {referralCode || "Loading..."}
          </div>
          <Button
            onClick={copyCode}
            className="bg-[#00BFFF]/15 hover:bg-[#00BFFF]/25 text-[#00BFFF] border border-[#00BFFF]/30 gap-1.5"
            variant="outline"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={referralLink}
            readOnly
            className="bg-[#0F1117] border-[#2A2D3A] text-[#8B8D97] text-xs font-mono truncate"
          />
          <Button size="sm" variant="outline" onClick={copyLink}
            className="shrink-0 border-[#2A2D3A] text-[#E8E8ED] gap-1 text-xs">
            {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <ExternalLink className="w-3 h-3" />}
            {copiedLink ? "Copied!" : "Share"}
          </Button>
        </div>
      </div>

      {/* ── Bonus info ───────────────────────────── */}
      <div className="p-3 rounded-xl border border-[#FFB6C1]/25 bg-[#FFB6C1]/5 space-y-2">
        <p className="text-xs font-semibold text-[#FFB6C1] flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> How it works</p>
        <div className="space-y-1.5 text-xs text-[#8B8D97]">
          <div className="flex items-center gap-2">
            <ChevronRight className="w-3 h-3 text-[#FFB6C1] shrink-0" />
            <span>Friend signs up → you both get a bonus when they subscribe</span>
          </div>
          <div className="flex items-center gap-2">
            <ChevronRight className="w-3 h-3 text-[#FFB6C1] shrink-0" />
            <span><strong className="text-[#E8E8ED]">1 free month</strong> OR <strong className="text-[#E8E8ED]">$5 credit</strong> per successful referral</span>
          </div>
          <div className="flex items-center gap-2">
            <ChevronRight className="w-3 h-3 text-[#FFB6C1] shrink-0" />
            <span>Applied automatically via Stripe discount on next billing cycle</span>
          </div>
        </div>
      </div>

      {/* ── Stats grid ───────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Pending", value: pending, color: "#8B8D97" },
          { label: "Signed Up", value: signedUp, color: "#00BFFF" },
          { label: "Subscribed", value: subscribed, color: "#10B981" },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 rounded-xl border border-[#2A2D3A] text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{isLoading ? "—" : s.value}</p>
            <p className="text-[10px] text-[#8B8D97] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Earned bonuses ───────────────────────── */}
      {(freeMonths > 0 || credits > 0) && (
        <div className="p-3 rounded-xl border border-[#00BFFF]/30 bg-gradient-to-r from-[#00BFFF]/10 to-[#9370DB]/5">
          <p className="text-xs font-semibold text-[#00BFFF] mb-2 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" /> Bonuses Earned
          </p>
          <div className="flex gap-3 flex-wrap">
            {freeMonths > 0 && (
              <Badge className="bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/30 text-xs gap-1">
                <Zap className="w-3 h-3" /> {freeMonths} Free Month{freeMonths > 1 ? "s" : ""}
              </Badge>
            )}
            {credits > 0 && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs gap-1">
                ${credits * 5} Credits
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-[#8B8D97] mt-1.5">Applied automatically at next billing cycle via Stripe.</p>
        </div>
      )}

      {/* ── Recent referrals ─────────────────────── */}
      {recentReferrals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#8B8D97] uppercase tracking-wider">Recent Invites</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {recentReferrals.map(r => (
              <div key={r.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg glass-card border border-[#2A2D3A]">
                <div className="w-6 h-6 rounded-full bg-[#9370DB]/20 flex items-center justify-center text-xs text-[#9370DB] shrink-0">
                  {r.referred_email?.[0]?.toUpperCase() || "?"}
                </div>
                <span className="text-xs text-[#E8E8ED] flex-1 truncate">{r.referred_email}</span>
                <span className="text-[10px] text-[#8B8D97]">
                  {r.status === "pending"   && "⏳ Pending"}
                  {r.status === "signed_up" && "✓ Signed Up"}
                  {r.status === "subscribed"&& "⭐ Subscribed"}
                  {r.status === "rewarded"  && "🎉 Rewarded"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Redeem a code ────────────────────────── */}
      <div className="border-t border-[#2A2D3A] pt-4">
        <p className="text-xs font-semibold text-[#8B8D97] uppercase tracking-wider mb-2">Have a Friend's Code?</p>
        <div className="flex gap-2">
          <Input
            value={redeemCode}
            onChange={e => setRedeemCode(e.target.value.toUpperCase())}
            placeholder="Enter referral code"
            maxLength={8}
            className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] font-mono uppercase"
          />
          <Button size="sm" onClick={handleRedeem} disabled={redeeming || !redeemCode.trim()}
            className="bg-[#9370DB]/20 border border-[#9370DB]/40 text-[#9370DB] hover:bg-[#9370DB]/30" variant="outline">
            {redeeming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
          </Button>
        </div>
        <p className="text-[10px] text-[#8B8D97] mt-1.5">Your friend earns a bonus when you subscribe.</p>
      </div>
    </div>
  );
}