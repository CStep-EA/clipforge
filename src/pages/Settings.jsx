import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Bell, LogOut, Save, Users, UserPlus, Gift, Lock, ArrowRight, Crown } from "lucide-react";
import { useSubscription } from "@/components/shared/useSubscription";
import FamilyManagement from "@/components/family/FamilyManagement";
import FamilyUpgradePrompt from "@/components/family/FamilyUpgradePrompt";
import FriendsPanel from "@/components/friends/FriendsPanel";
import ReferralPanel from "@/components/referral/ReferralPanel";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function Settings() {
  const [user, setUser] = useState(null);
  const { isFamily, isPro, plan } = useSubscription();
  const [preferences, setPreferences] = useState({
    notifications_enabled: true,
    email_digests: true,
    dark_mode: true,
  });

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

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        {!isPro && (
          <Link to={createPageUrl("Pricing")}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[#9370DB]/40 text-[#9370DB] hover:bg-[#9370DB]/10 transition-all">
              <Crown className="w-3 h-3" /> Upgrade
            </button>
          </Link>
        )}
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

      {/* Friends & Connections */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <UserPlus className="w-5 h-5 text-[#00BFFF]" />
          <div>
            <h2 className="font-semibold">Friends & Connections</h2>
            <p className="text-[10px] text-[#8B8D97]">Manage friends, invites & sharing permissions</p>
          </div>
          {!isPro && (
            <Link to={createPageUrl("Pricing")} className="ml-auto">
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#00BFFF]/30 text-[#00BFFF]">Pro+</span>
            </Link>
          )}
        </div>
        {isPro ? (
          <FriendsPanel user={user} plan={plan} />
        ) : (
          <div className="p-4 rounded-xl border border-[#00BFFF]/15 bg-[#00BFFF]/5 text-center space-y-3">
            <Lock className="w-6 h-6 text-[#00BFFF] mx-auto" />
            <p className="text-sm text-[#8B8D97]">Friends & sharing features require <strong className="text-[#E8E8ED]">Pro</strong> or higher.</p>
            <Link to={createPageUrl("Pricing")}>
              <button className="flex items-center gap-1.5 mx-auto px-4 py-2 rounded-xl text-xs font-semibold bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30 hover:bg-[#00BFFF]/25 transition-all">
                Upgrade to Pro <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
        )}
      </Card>

      {/* Referrals */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Gift className="w-5 h-5 text-[#FFB6C1]" />
          <div>
            <h2 className="font-semibold">Referrals</h2>
            <p className="text-[10px] text-[#8B8D97]">Invite friends and earn bonuses</p>
          </div>
        </div>
        <ReferralPanel user={user} />
      </Card>

      {/* Family Accounts */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <Users className="w-5 h-5 text-[#EC4899]" />
          <div>
            <h2 className="font-semibold">Family Accounts</h2>
            <p className="text-[10px] text-[#8B8D97]">Manage family members, roles & parental controls</p>
          </div>
          {!isFamily && (
            <Link to={createPageUrl("Pricing")} className="ml-auto">
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#EC4899]/30 text-[#EC4899]">Family+</span>
            </Link>
          )}
        </div>
        {isFamily ? (
          <FamilyManagement user={user} />
        ) : (
          <FamilyUpgradePrompt feature="family member management, parental controls & child-safe mode" />
        )}
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
    </div>
  );
}