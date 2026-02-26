import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, UserPlus, Shield, Baby, AlertTriangle, Check, X, Trash2
} from "lucide-react";
import { toast } from "sonner";

export default function FamilyManagement({ user }) {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "child", is_under_13: false });
  const [pendingInvite, setPendingInvite] = useState(null);

  const { data: members = [] } = useQuery({
    queryKey: ["familyMembers", user?.email],
    queryFn: () => base44.entities.FamilyMember.filter({ family_owner_email: user.email }),
    enabled: !!user?.email,
  });

  const handleInviteSubmit = () => {
    if (form.is_under_13) {
      // COPPA: require explicit parental consent before creating
      setPendingInvite({ ...form });
      setInviteOpen(false);
      setConsentOpen(true);
    } else {
      doInvite({ ...form, age_verified: false });
    }
  };

  const doInvite = async (data) => {
    await base44.entities.FamilyMember.create({
      family_owner_email: user.email,
      member_email: data.email,
      member_name: data.name,
      role: data.role,
      is_under_13: data.is_under_13 || false,
      age_verified: data.age_verified || false,
      consented_at: data.age_verified ? new Date().toISOString() : null,
      status: "pending",
      child_safe_mode: data.role === "child",
    });
    queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
    toast.success(`Invite sent to ${data.email}`);
    setForm({ email: "", name: "", role: "child", is_under_13: false });
    setConsentOpen(false);
    setInviteOpen(false);
  };

  const handleConsentConfirm = () => {
    doInvite({ ...pendingInvite, age_verified: true });
    setPendingInvite(null);
  };

  const handleRemove = async (member) => {
    await base44.entities.FamilyMember.delete(member.id);
    queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
    toast.success("Member removed");
  };

  const toggleChildSafe = async (member) => {
    await base44.entities.FamilyMember.update(member.id, { child_safe_mode: !member.child_safe_mode });
    queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-[#EC4899]" /> Family Members
          </h2>
          <p className="text-xs text-[#8B8D97] mt-0.5">{members.length} member{members.length !== 1 ? "s" : ""} in your family plan</p>
        </div>
        <Button
          size="sm"
          onClick={() => setInviteOpen(true)}
          className="bg-gradient-to-r from-[#EC4899] to-[#9370DB] text-white gap-1.5 text-xs"
        >
          <UserPlus className="w-3.5 h-3.5" /> Invite Member
        </Button>
      </div>

      {/* Member list */}
      {members.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-[#2A2D3A] text-center">
          <Users className="w-8 h-8 text-[#8B8D97] mx-auto mb-2" />
          <p className="text-sm text-[#8B8D97]">No family members yet. Invite your family!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <Card key={m.id} className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === "parent" ? "bg-[#00BFFF]/15" : "bg-[#EC4899]/15"}`}>
                  {m.role === "parent" ? (
                    <Shield className="w-4 h-4 text-[#00BFFF]" />
                  ) : (
                    <Baby className="w-4 h-4 text-[#EC4899]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{m.member_name || m.member_email}</p>
                    <Badge variant="outline" className={`text-[9px] ${m.role === "parent" ? "border-[#00BFFF]/40 text-[#00BFFF]" : "border-[#EC4899]/40 text-[#EC4899]"}`}>
                      {m.role}
                    </Badge>
                    <Badge variant="outline" className={`text-[9px] ${m.status === "active" ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"}`}>
                      {m.status}
                    </Badge>
                    {m.is_under_13 && (
                      <Badge variant="outline" className="text-[9px] border-orange-500/40 text-orange-400">
                        COPPA
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8B8D97] truncate">{m.member_email}</p>
                </div>

                {m.role === "child" && (
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8B8D97]">
                    <span>Safe mode</span>
                    <Switch
                      checked={m.child_safe_mode ?? true}
                      onCheckedChange={() => toggleChildSafe(m)}
                      className="scale-75"
                    />
                  </div>
                )}

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-[#8B8D97] hover:text-red-400 flex-shrink-0"
                  onClick={() => handleRemove(m)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
          <DialogHeader>
            <DialogTitle className="gradient-text flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Invite Family Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-[#8B8D97] block mb-1">Email address</label>
              <Input
                placeholder="family@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
              />
            </div>
            <div>
              <label className="text-xs text-[#8B8D97] block mb-1">Display name (optional)</label>
              <Input
                placeholder="e.g., Mom, Jake"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
              />
            </div>
            <div>
              <label className="text-xs text-[#8B8D97] block mb-2">Role</label>
              <div className="flex gap-2">
                {["parent", "child"].map(role => (
                  <button
                    key={role}
                    onClick={() => setForm(p => ({ ...p, role }))}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all capitalize ${form.role === role ? "border-[#EC4899]/60 bg-[#EC4899]/10 text-[#EC4899]" : "border-[#2A2D3A] text-[#8B8D97] hover:border-[#EC4899]/30"}`}
                  >
                    {role === "parent" ? "👨‍👩‍👧 Parent" : "👶 Child"}
                  </button>
                ))}
              </div>
            </div>
            {form.role === "child" && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/8 border border-orange-500/25">
                <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-orange-400">COPPA Notice</p>
                  <p className="text-[10px] text-[#8B8D97] mt-0.5">Is this child under 13? Parental consent required.</p>
                </div>
                <Switch
                  checked={form.is_under_13}
                  onCheckedChange={v => setForm(p => ({ ...p, is_under_13: v }))}
                  className="scale-75"
                />
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setInviteOpen(false)} className="text-[#8B8D97]">Cancel</Button>
            <Button
              disabled={!form.email}
              onClick={handleInviteSubmit}
              className="bg-gradient-to-r from-[#EC4899] to-[#9370DB] text-white"
            >
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COPPA Consent dialog */}
      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="bg-[#1A1D27] border-orange-500/30 text-[#E8E8ED]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="w-5 h-5" /> Parental Consent Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1 text-sm text-[#C0C2CC] leading-relaxed">
            <p>You're inviting a child under 13. Under <strong className="text-orange-400">COPPA</strong> (Children's Online Privacy Protection Act), we require your explicit parental consent before creating an account for this child.</p>
            <ul className="space-y-1.5 text-xs text-[#8B8D97]">
              <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" /> Child-safe mode will be automatically enabled</li>
              <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" /> Content filters and parental controls will apply</li>
              <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" /> No personal data collected beyond name and email</li>
              <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" /> All activity visible to you as parent</li>
            </ul>
            <p className="text-[11px] text-[#8B8D97] italic">By confirming, you certify you are this child's parent or legal guardian and consent to their account creation in accordance with COPPA.</p>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setConsentOpen(false)} className="text-[#8B8D97]">Cancel</Button>
            <Button onClick={handleConsentConfirm} className="bg-orange-500 hover:bg-orange-600 text-white">
              I Consent — Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}