import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Gift, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function ReferralPanel({ user }) {
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState([]);
  const [bonus, setBonus] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    loadReferralData();
  }, [user?.email]);

  const loadReferralData = async () => {
    try {
      // Fetch user's referrals
      const data = await base44.entities.Referral.filter({
        referrer_email: user.email,
      });
      setReferrals(data);

      // Generate unique code from email hash
      const code = btoa(user.email).substring(0, 8).toUpperCase();
      setReferralCode(code);

      // Check for earned bonus
      const bonusRecord = await base44.entities.Referral.filter({
        referrer_email: user.email,
        status: "rewarded",
      });
      if (bonusRecord.length > 0) {
        setBonus(bonusRecord[0]);
      }
    } catch (err) {
      console.error("Failed to load referrals:", err);
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Referral link copied!");
  };

  const successCount = referrals.filter((r) => r.status === "signed_up" || r.status === "subscribed").length;
  const pendingCount = referrals.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Gift className="w-5 h-5 text-[#FFB6C1]" />
        <div>
          <h2 className="font-semibold">Refer a Friend</h2>
          <p className="text-[10px] text-[#8B8D97]">Earn free months & credits by inviting friends</p>
        </div>
      </div>

      {/* Your Referral Code */}
      <div className="glass-card p-4 rounded-lg border border-[#2A2D3A]">
        <p className="text-xs text-[#8B8D97] mb-2">Your Referral Code</p>
        <div className="flex gap-2">
          <Input
            value={referralCode}
            disabled
            className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] font-mono"
          />
          <Button
            onClick={copyLink}
            className="bg-[#00BFFF] hover:bg-[#0099CC] text-[#0F1117] gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-[#8B8D97] mt-2">
          Share your code or link to earn rewards when friends sign up
        </p>
      </div>

      {/* Bonus Tracker */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 rounded-lg border border-[#9370DB]/30">
          <p className="text-xs text-[#8B8D97]">Pending Signups</p>
          <p className="text-2xl font-bold text-[#00BFFF] mt-1">{pendingCount}</p>
        </div>
        <div className="glass-card p-4 rounded-lg border border-[#FFB6C1]/30">
          <p className="text-xs text-[#8B8D97]">Successful Referrals</p>
          <p className="text-2xl font-bold text-[#FFB6C1] mt-1">{successCount}</p>
        </div>
      </div>

      {/* Earned Bonus */}
      {bonus && (
        <div className="glass-card p-4 rounded-lg border border-[#00BFFF]/40 bg-gradient-to-r from-[#00BFFF]/10 to-transparent">
          <p className="text-xs text-[#8B8D97] mb-2">Bonus Earned</p>
          <p className="font-semibold text-[#FFB6C1]">
            {bonus.bonus_type === "free_month"
              ? "1 Month Free Extension"
              : bonus.bonus_type === "credit_5"
                ? "$5 Account Credit"
                : "Pending"}
          </p>
          <p className="text-xs text-[#8B8D97] mt-2">Applied automatically to your account</p>
        </div>
      )}

      {/* Recent Referrals */}
      {referrals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#8B8D97] uppercase">Recent Invites</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {referrals.slice(-5).map((ref) => (
              <div key={ref.id} className="text-xs p-2 rounded glass-card border border-[#2A2D3A]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[#E8E8ED]">{ref.referred_email}</p>
                    <p className="text-[#8B8D97]">
                      {ref.status === "pending" && "⏳ Pending"}
                      {ref.status === "signed_up" && "✓ Signed Up"}
                      {ref.status === "subscribed" && "⭐ Subscribed"}
                      {ref.status === "rewarded" && "🎉 Rewarded"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}