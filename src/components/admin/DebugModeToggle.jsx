import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Bug, ChevronDown, ChevronUp, Zap, Gift, Users, CreditCard, Plug, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const DEBUG_KEY = "cf_debug_mode";
const DEBUG_TIER_KEY = "cf_debug_tier";

export const isDebugMode = () => localStorage.getItem(DEBUG_KEY) === "true";
export const getDebugTier = () => localStorage.getItem(DEBUG_TIER_KEY) || "free";

export default function DebugModeToggle() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(DEBUG_KEY) === "true");
  const [tier, setTier] = useState(() => localStorage.getItem(DEBUG_TIER_KEY) || "free");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState({});

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(DEBUG_KEY, String(next));
    toast.success(next ? "🐛 Debug mode ON — UI reflects selected tier" : "Debug mode OFF");
    window.dispatchEvent(new Event("cf-debug-change"));
  };

  const setDebugTier = (t) => {
    setTier(t);
    localStorage.setItem(DEBUG_TIER_KEY, t);
    toast.success(`Debug tier → ${t}`);
    window.dispatchEvent(new Event("cf-debug-change"));
  };

  const simulateAction = async (action) => {
    setLoading(prev => ({ ...prev, [action]: true }));
    try {
      if (action === "trial") {
        await base44.entities.PremiumTrial.create({
          user_email: "__debug@clipforge.test",
          trial_plan: "premium",
          trial_start: new Date().toISOString(),
          trial_end: new Date(Date.now() + 7 * 86400000).toISOString(),
          is_active: true,
          converted: false,
        });
        toast.success("✅ Test trial record created");
      } else if (action === "referral") {
        await base44.entities.Referral.create({
          referrer_email: "__debug@clipforge.test",
          referral_code: "DEBUG-TEST",
          referred_email: "__referred@clipforge.test",
          status: "signed_up",
          bonus_applied: false,
          bonus_type: "free_month",
        });
        toast.success("✅ Test referral record created");
      } else if (action === "family") {
        await base44.entities.FamilyMember.create({
          family_owner_email: "__debug@clipforge.test",
          member_email: "__child@clipforge.test",
          member_name: "Test Child",
          role: "child",
          is_under_13: true,
          status: "active",
          child_safe_mode: true,
        });
        toast.success("✅ Test family member record created");
      }
    } catch (e) {
      toast.error(`Simulate failed: ${e.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [action]: false }));
    }
  };

  const clearDebugData = async () => {
    setLoading(prev => ({ ...prev, clear: true }));
    try {
      const trials = await base44.entities.PremiumTrial.filter({ user_email: "__debug@clipforge.test" });
      const referrals = await base44.entities.Referral.filter({ referrer_email: "__debug@clipforge.test" });
      const family = await base44.entities.FamilyMember.filter({ family_owner_email: "__debug@clipforge.test" });
      await Promise.all([
        ...trials.map(t => base44.entities.PremiumTrial.delete(t.id)),
        ...referrals.map(r => base44.entities.Referral.delete(r.id)),
        ...family.map(f => base44.entities.FamilyMember.delete(f.id)),
      ]);
      toast.success("🗑️ Debug test records cleared");
    } catch (e) {
      toast.error(`Clear failed: ${e.message}`);
    } finally {
      setLoading(prev => ({ ...prev, clear: false }));
    }
  };

  return (
    <Card className="glass-card border-amber-500/30 bg-amber-500/5">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-300">Debug / Test Mode</span>
            {enabled && (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
                {tier} tier preview
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
            <button
              onClick={toggle}
              className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? "bg-amber-500" : "bg-[#2A2D3A]"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-amber-500/20 pt-4">
            {/* Tier preview */}
            <div>
              <p className="text-xs text-amber-300/70 font-semibold mb-2">Preview UI as tier:</p>
              <div className="flex gap-2 flex-wrap">
                {["free", "pro", "premium", "family"].map(t => (
                  <button
                    key={t}
                    onClick={() => setDebugTier(t)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${tier === t && enabled ? "border-amber-500/60 bg-amber-500/15 text-amber-300" : "border-[#2A2D3A] text-[#8B8D97] hover:border-amber-500/30"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#8B8D97] mt-1">Changes how tier-gated features appear in the UI (does not affect real billing).</p>
            </div>

            {/* Simulate actions */}
            <div>
              <p className="text-xs text-amber-300/70 font-semibold mb-2">Simulate & test records:</p>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="text-xs border-[#2A2D3A] gap-1 h-7"
                  onClick={() => simulateAction("trial")} disabled={loading.trial}>
                  {loading.trial ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Create Trial
                </Button>
                <Button size="sm" variant="outline" className="text-xs border-[#2A2D3A] gap-1 h-7"
                  onClick={() => simulateAction("referral")} disabled={loading.referral}>
                  {loading.referral ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
                  Create Referral
                </Button>
                <Button size="sm" variant="outline" className="text-xs border-[#2A2D3A] gap-1 h-7"
                  onClick={() => simulateAction("family")} disabled={loading.family}>
                  {loading.family ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
                  Create Family
                </Button>
                <Button size="sm" variant="outline" className="text-xs border-red-500/30 text-red-400 gap-1 h-7"
                  onClick={clearDebugData} disabled={loading.clear}>
                  {loading.clear ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Clear Test Data
                </Button>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#0F1117] border border-[#2A2D3A]">
              <p className="text-[10px] text-[#8B8D97]">
                ⚠️ Debug mode only affects UI rendering and creates <code className="text-amber-300">__debug@clipforge.test</code> records. Real user billing is unaffected.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}