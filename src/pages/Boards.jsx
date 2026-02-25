import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Users, Lock, Globe, Share2, Link2, Copy, Mail, Loader2, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { usePlan } from "@/components/shared/usePlan";
import PremiumGate from "@/components/shared/PremiumGate";
import { toast } from "sonner";

const boardColors = ["#00BFFF", "#9370DB", "#FFB6C1", "#10B981", "#F59E0B", "#EC4899"];
const boardIcons = ["🏠", "❤️", "🎁", "🍽️", "✈️", "📚", "🎬", "🛍️", "🎯", "💡"];

export default function Boards() {
  const [createOpen, setCreateOpen] = useState(false);
  const [shareDialog, setShareDialog] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", icon: "🏠", color: "#00BFFF", members: [], is_public: false });
  const [memberInput, setMemberInput] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [sharing, setSharing] = useState(false);
  const queryClient = useQueryClient();
  const { isPro, isPremium } = usePlan();

  const { data: boards = [] } = useQuery({
    queryKey: ["boards"],
    queryFn: () => base44.entities.SharedBoard.list("-created_date"),
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["savedItems"],
    queryFn: () => base44.entities.SavedItem.list(),
  });

  const handleCreate = async () => {
    await base44.entities.SharedBoard.create(form);
    queryClient.invalidateQueries({ queryKey: ["boards"] });
    setCreateOpen(false);
    setForm({ name: "", description: "", icon: "🏠", color: "#00BFFF", members: [], is_public: false });
  };

  const addMember = () => {
    if (memberInput.trim() && !form.members.includes(memberInput.trim())) {
      setForm(prev => ({ ...prev, members: [...prev.members, memberInput.trim()] }));
      setMemberInput("");
    }
  };

  const handleShare = async (board) => {
    setSharing(true);
    setShareDialog(board);
    setShareLink("");
    const res = await base44.functions.invoke("shareBoard", { board_id: board.id });
    setShareLink(res.data?.share_link || "");
    setSharing(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail || !shareDialog) return;
    setSharing(true);
    await base44.functions.invoke("shareBoard", { board_id: shareDialog.id, invitee_email: inviteEmail });
    queryClient.invalidateQueries({ queryKey: ["boards"] });
    toast.success(`Invite sent to ${inviteEmail}!`);
    setInviteEmail("");
    setSharing(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Link copied!");
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collaborative Spaces</h1>
          <p className="text-[#8B8D97] text-sm">Share boards with your partner, roommates, or friends</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-gradient-to-r from-[#9370DB] to-[#FFB6C1] text-white gap-2"
        >
          <Plus className="w-4 h-4" /> New Board
        </Button>
      </div>

      {boards.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-[#9370DB] mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No boards yet</h3>
          <p className="text-[#8B8D97] text-sm mb-4">Create a board to share saves with couples, roommates, or groups</p>
          <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-[#9370DB] to-[#FFB6C1] text-white">
            Create First Board
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board, i) => {
            const boardItemCount = allItems.filter(item => item.board_id === board.id).length;
            return (
              <motion.div key={board.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="glass-card p-5 transition-all group" style={{ borderColor: `${board.color || "#00BFFF"}30` }}>
                  <div className="flex items-start justify-between mb-3">
                    <Link to={createPageUrl(`Saves?board=${board.id}`)} className="flex items-center gap-3 flex-1">
                      <span className="text-3xl">{board.icon || "🏠"}</span>
                      <div>
                        <h3 className="font-semibold group-hover:text-[#00BFFF] transition-colors">{board.name}</h3>
                        {board.description && (
                          <p className="text-xs text-[#8B8D97] mt-0.5 line-clamp-1">{board.description}</p>
                        )}
                      </div>
                    </Link>
                    {board.is_public ? <Globe className="w-4 h-4 text-[#8B8D97]" /> : <Lock className="w-4 h-4 text-[#8B8D97]" />}
                  </div>

                  <div className="flex items-center gap-3 mb-3 pt-2 border-t border-[#2A2D3A]">
                    <span className="text-xs text-[#8B8D97]"><Users className="w-3 h-3 inline mr-1" />{board.members?.length || 0} members</span>
                    <span className="text-xs text-[#8B8D97]">📌 {boardItemCount} saves</span>
                  </div>

                  {board.members?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {board.members.slice(0, 3).map((m, j) => (
                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-[#9370DB]/15 text-[#9370DB]">{m.split("@")[0]}</span>
                      ))}
                      {board.members.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2A2D3A] text-[#8B8D97]">+{board.members.length - 3}</span>
                      )}
                    </div>
                  )}

                  <Button size="sm" variant="outline" className="w-full border-[#2A2D3A] text-xs h-7 gap-1 hover:border-[#9370DB]/40"
                    onClick={() => handleShare(board)}>
                    <Share2 className="w-3 h-3" /> Share & Invite
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Collaborative features showcase */}
      <PremiumGate allowed={isPremium} plan="premium" label="Real-time collaboration and gift list sync requires Premium">
        <Card className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#9370DB]" /> Collaborative Features
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { emoji: "🎁", label: "Gift Lists", desc: "Share wish lists for birthdays/holidays" },
              { emoji: "🏠", label: "Roommate Board", desc: "Shared shopping & task lists" },
              { emoji: "❤️", label: "Couple Space", desc: "Date ideas, recipes, travel plans" },
              { emoji: "📅", label: "Event Planning", desc: "Collaborative event saves & RSVPs" },
            ].map(f => (
              <div key={f.label} className="p-3 rounded-xl bg-[#0F1117] border border-[#2A2D3A]">
                <span className="text-xl">{f.emoji}</span>
                <p className="text-xs font-semibold mt-2">{f.label}</p>
                <p className="text-[10px] text-[#8B8D97] mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </PremiumGate>

      {/* Create board dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
          <DialogHeader>
            <DialogTitle className="gradient-text">Create Collaborative Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-[#8B8D97]">Board Name</Label>
              <Input placeholder="e.g., Date Night Ideas" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]" />
            </div>
            <div>
              <Label className="text-xs text-[#8B8D97]">Description (optional)</Label>
              <Input placeholder="What is this board for?" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]" />
            </div>
            <div>
              <Label className="text-xs text-[#8B8D97]">Icon</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {boardIcons.map(icon => (
                  <button key={icon} onClick={() => setForm({ ...form, icon })}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all
                      ${form.icon === icon ? "bg-[#00BFFF]/20 ring-2 ring-[#00BFFF]" : "bg-[#0F1117] hover:bg-[#2A2D3A]"}`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-[#8B8D97]">Color</Label>
              <div className="flex gap-2 mt-1">
                {boardColors.map(color => (
                  <button key={color} onClick={() => setForm({ ...form, color })}
                    className={`w-8 h-8 rounded-full transition-all ${form.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#1A1D27]" : ""}`}
                    style={{ background: color }} />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Public Board</p>
                <p className="text-xs text-[#8B8D97]">Anyone with the link can view</p>
              </div>
              <Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
            </div>
            <div>
              <Label className="text-xs text-[#8B8D97]">Add Members (email)</Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="email@example.com" value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMember())}
                  className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]" />
                <Button variant="outline" onClick={addMember} className="border-[#2A2D3A] text-[#E8E8ED]">Add</Button>
              </div>
              {form.members.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.members.map((m, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#9370DB]/15 text-[#9370DB] cursor-pointer hover:bg-red-500/20 hover:text-red-400"
                      onClick={() => setForm(prev => ({ ...prev, members: prev.members.filter((_, j) => j !== i) }))}>
                      {m} ×
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleCreate} disabled={!form.name} className="w-full bg-gradient-to-r from-[#9370DB] to-[#FFB6C1] text-white">
              Create Board
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={!!shareDialog} onOpenChange={() => { setShareDialog(null); setShareLink(""); setInviteEmail(""); }}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
          <DialogHeader>
            <DialogTitle>Share "{shareDialog?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Share link */}
            <div>
              <Label className="text-xs text-[#8B8D97]">Shareable Link</Label>
              <div className="flex gap-2 mt-1">
                <Input value={sharing ? "Generating..." : shareLink || "Click to generate link"}
                  readOnly className="bg-[#0F1117] border-[#2A2D3A] text-[#8B8D97] text-xs" />
                <Button size="sm" variant="outline" onClick={copyLink} disabled={!shareLink || sharing}
                  className="border-[#2A2D3A] shrink-0">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Email invite */}
            <div>
              <Label className="text-xs text-[#8B8D97]">Invite via Email</Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="friend@email.com" value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]" />
                <Button onClick={handleInvite} disabled={!inviteEmail || sharing}
                  className="bg-gradient-to-r from-[#9370DB] to-[#FFB6C1] text-white shrink-0 gap-1">
                  {sharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  Invite
                </Button>
              </div>
            </div>

            {shareDialog?.members?.length > 0 && (
              <div>
                <Label className="text-xs text-[#8B8D97]">Current Members</Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {shareDialog.members.map((m, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#9370DB]/15 text-[#9370DB]">{m}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}