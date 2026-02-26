import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { UserPlus, UserCheck, UserX, Mail, Clock, Users, Link2 } from "lucide-react";
import { toast } from "sonner";

const FRIEND_LIMIT = { free: 5, pro: 20, premium: 20, family: 999 };

export default function FriendsPanel({ user, plan = "free" }) {
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const limit = FRIEND_LIMIT[plan] ?? 5;

  const { data: sent = [] } = useQuery({
    queryKey: ["friends_sent", user?.email],
    queryFn: () => base44.entities.FriendConnection.filter({ requester_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: received = [] } = useQuery({
    queryKey: ["friends_received", user?.email],
    queryFn: () => base44.entities.FriendConnection.filter({ recipient_email: user.email }),
    enabled: !!user?.email,
  });

  const accepted = sent.filter(f => f.status === "accepted");
  const pending_sent = sent.filter(f => f.status === "pending");
  const pending_received = received.filter(f => f.status === "pending");

  const atLimit = accepted.length >= limit;

  const sendInvite = async () => {
    if (!email) return;
    if (atLimit) {
      toast.error(`Your ${plan} plan supports up to ${limit} friends. Upgrade for more!`);
      return;
    }
    const existing = sent.find(f => f.recipient_email === email);
    if (existing) { toast.error("Already connected or invited"); return; }

    await base44.entities.FriendConnection.create({
      requester_email: user.email,
      recipient_email: email,
      recipient_name: name || email.split("@")[0],
      status: "pending",
      source: "manual",
    });
    qc.invalidateQueries({ queryKey: ["friends_sent"] });
    toast.success(`Invite sent to ${email}!`);
    setEmail(""); setName(""); setInviteOpen(false);
  };

  const respond = async (conn, status) => {
    await base44.entities.FriendConnection.update(conn.id, { status });
    qc.invalidateQueries({ queryKey: ["friends_received"] });
    qc.invalidateQueries({ queryKey: ["friends_sent"] });
    toast.success(status === "accepted" ? "Friend accepted!" : "Request declined");
  };

  const remove = async (conn) => {
    await base44.entities.FriendConnection.delete(conn.id);
    qc.invalidateQueries({ queryKey: ["friends_sent"] });
    qc.invalidateQueries({ queryKey: ["friends_received"] });
    toast.success("Friend removed");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00BFFF]" /> Friends
          </h2>
          <p className="text-xs text-[#8B8D97]">{accepted.length}/{limit === 999 ? "∞" : limit} connections</p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}
          className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-1.5 text-xs animate-share-pulse">
          <UserPlus className="w-3.5 h-3.5" /> Add Friend
        </Button>
      </div>

      {/* Pending received */}
      {pending_received.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide">Pending Requests</p>
          {pending_received.map(conn => (
            <Card key={conn.id} className="glass-card p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-400/15 flex items-center justify-center flex-shrink-0">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{conn.requester_email}</p>
                <p className="text-[10px] text-[#8B8D97]">wants to connect</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 hover:bg-emerald-400/10"
                  onClick={() => respond(conn, "accepted")}>
                  <UserCheck className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:bg-red-400/10"
                  onClick={() => respond(conn, "declined")}>
                  <UserX className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Connected friends */}
      {accepted.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-[#00BFFF] uppercase tracking-wide">Connected</p>
          {accepted.map(conn => (
            <Card key={conn.id} className="glass-card p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00BFFF]/15 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-3.5 h-3.5 text-[#00BFFF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{conn.recipient_name || conn.recipient_email}</p>
                <p className="text-[10px] text-[#8B8D97] truncate">{conn.recipient_email}</p>
              </div>
              <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">connected</Badge>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-[#8B8D97] hover:text-red-400"
                onClick={() => remove(conn)}>
                <UserX className="w-3.5 h-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Pending sent */}
      {pending_sent.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-[#8B8D97] uppercase tracking-wide">Sent Invites</p>
          {pending_sent.map(conn => (
            <Card key={conn.id} className="glass-card p-3 flex items-center gap-3 opacity-70">
              <div className="w-8 h-8 rounded-full bg-[#2A2D3A] flex items-center justify-center flex-shrink-0">
                <Clock className="w-3.5 h-3.5 text-[#8B8D97]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{conn.recipient_email}</p>
                <p className="text-[10px] text-[#8B8D97]">invite pending</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-[#8B8D97] hover:text-red-400"
                onClick={() => remove(conn)}>
                <UserX className="w-3.5 h-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {accepted.length === 0 && pending_sent.length === 0 && pending_received.length === 0 && (
        <div className="p-6 rounded-xl border border-dashed border-[#2A2D3A] text-center">
          <Users className="w-8 h-8 text-[#8B8D97] mx-auto mb-2" />
          <p className="text-sm text-[#8B8D97]">No friends yet. Invite people to share saves!</p>
        </div>
      )}

      {plan === "free" && (
        <p className="text-[10px] text-amber-400 text-center">
          Free tier: up to 5 friends. <a href="/pricing" className="underline">Upgrade to Pro</a> for 20+
        </p>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
          <DialogHeader>
            <DialogTitle className="gradient-text flex items-center gap-2">
              <Link2 className="w-4 h-4" /> Invite a Friend
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-[#8B8D97] block mb-1">Friend's email</label>
              <Input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="friend@example.com"
                className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]" />
            </div>
            <div>
              <label className="text-xs text-[#8B8D97] block mb-1">Name (optional)</label>
              <Input value={name} onChange={e => setName(e.target.value)}
                placeholder="Their name"
                className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]" />
            </div>
            <p className="text-[10px] text-[#8B8D97]">
              By sending an invite you consent to sharing your ClipForge profile with this person. They'll receive an email link to connect. (GDPR: you can remove connections anytime.)
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)} className="text-[#8B8D97]">Cancel</Button>
            <Button disabled={!email} onClick={sendInvite}
              className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white animate-btn-pulse">
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}