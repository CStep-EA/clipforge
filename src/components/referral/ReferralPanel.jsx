import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Gift, Copy, Check, Users, Star, Zap } from "lucide-react";
import { toast } from "sonner";

function generateCode(email) {
  const base = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6);
  const hash = Math.abs(email.split("").reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0)) % 9000 + 1000;
  return `${base}${hash}`;
}

export default function ReferralPanel({ user }) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const code = user?.email ? generateCode(user.email) : "---";
  const referralLink = `${window.location.origin}?ref=${code}`;

  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals", user?.email],
    queryFn: () => base44.entities.Referral.filter({ referrer_email: user.email }),
    enabled: !!user?.email,
  });

  const rewarded = referrals.filter(r => r.status === "rewarded" || r.bonus_applied);
  const subscribed = referrals.filter(r => r.status === "subscribed" || r.status === "rewarded");

  const copy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <Gift className="w-5 h-5 text-[#9370DB]" />
        <div>
          <h2 className="font-semibold">Refer a Friend</h2>
          <p className="text-[10px] text-[#8B8D97]">Earn bonuses when friends subscribe</p>
        </div>
      </div>

      {/* Rewards summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Referrals", value: referrals.length, color: "#00BFFF" },
          { label: "Subscribed", value: subscribed.length, color: "#9370DB" },
          { label: "Bonuses Earned", value: rewarded.length, color: "#EC4899" },
        ].map(stat => (
          <Card key={stat.label} className="glass-card p-3 text-center">
            <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-[9px] text-[#8B8D97] mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Referral link */}
      <div className="p-4 rounded-2xl border border-[#9370DB]/25 bg-gradient-to-br from-[#9370DB]/5 to-[#EC4899]/5 space-y-3">
        <p className="text-xs font-semibold text-[#E8E8ED]">Your referral link</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[10px] bg-[#0F1117] rounded-lg px-3 py-2 border border-[#2A2D3A] text-[#9370DB] truncate">
            {referralLink}
          </code>
          <Button size="icon" variant="outline" className="h-8 w-8 border-[#9370DB]/30 hover:bg-[#9370DB]/10 flex-shrink-0"
            onClick={copy}>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#9370DB]" />}
          </Button>
        </div>
        <div className="text-[10px] text-[#8B8D97] space-y-1">
          <p className="flex items-center gap-1.5"><Star className="w-3 h-3 text-amber-400" /> <strong className="text-[#E8E8ED]">You get:</strong> 1 free month on your plan when they subscribe</p>
          <p className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-[#00BFFF]" /> <strong className="text-[#E8E8ED]">They get:</strong> 20% off their first month</p>
        </div>
      </div>

      {/* Referral history */}
      {referrals.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-[#8B8D97] uppercase tracking-wide">Referral History</p>
          {referrals.slice(0, 5).map(r => (
            <div key={r.id} className="flex items-center justify-between py-2 border-b border-[#2A2D3A]">
              <div>
                <p className="text-xs font-medium">{r.referred_email || "Pending signup"}</p>
                <p className="text-[9px] text-[#8B8D97]">{new Date(r.created_date).toLocaleDateString()}</p>
              </div>
              <Badge variant="outline" className={`text-[9px] ${
                r.status === "rewarded" ? "border-emerald-400/40 text-emerald-400" :
                r.status === "subscribed" ? "border-[#9370DB]/40 text-[#9370DB]" :
                r.status === "signed_up" ? "border-[#00BFFF]/40 text-[#00BFFF]" :
                "border-[#2A2D3A] text-[#8B8D97]"
              }`}>
                {r.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}