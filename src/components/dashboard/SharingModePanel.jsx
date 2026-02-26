import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Heart, Home, UserPlus, Bell, Gift, Plus, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const MODES = [
  { id: "couples", label: "Couples", icon: Heart, color: "#FFB6C1", description: "Share wish lists & gift ideas" },
  { id: "roommates", label: "Roommates", icon: Home, color: "#00BFFF", description: "Shared shopping & household saves" },
  { id: "friends", label: "Friends", icon: Users, color: "#9370DB", description: "Group saves & event planning" },
  { id: "family", label: "Family", icon: UserPlus, color: "#10B981", description: "Family boards & reminders" },
];

export default function SharingModePanel() {
  const [open, setOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const queryClient = useQueryClient();

  const { data: boards = [] } = useQuery({
    queryKey: ["boards"],
    queryFn: () => base44.entities.SharedBoard.list("-created_date", 10),
  });

  const handleCreate = async () => {
    if (!selectedMode) return;
    setCreating(true);
    const mode = MODES.find(m => m.id === selectedMode);
    await base44.entities.SharedBoard.create({
      name: `${mode.label} Board`,
      description: mode.description,
      icon: mode.id === "couples" ? "❤️" : mode.id === "roommates" ? "🏠" : mode.id === "friends" ? "👥" : "👨‍👩‍👧",
      members: inviteEmail ? [inviteEmail] : [],
      color: mode.color,
    });
    queryClient.invalidateQueries({ queryKey: ["boards"] });
    setCreating(false);
    setCreated(true);
    setTimeout(() => { setOpen(false); setCreated(false); setSelectedMode(null); setInviteEmail(""); }, 1500);
  };

  // Stub: push notification reminder
  const sendReminder = (board) => {
    if ("Notification" in window) {
      Notification.requestPermission().then(perm => {
        if (perm === "granted") {
          new Notification(`${board.name} reminder 🔔`, {
            body: "Don't forget to check your shared saves!",
            icon: "/favicon.ico",
          });
        }
      });
    }
    alert(`Reminder sent to members of "${board.name}"!`);
  };

  const sharingBoards = boards.filter(b => b.members?.length > 0 || ["❤️","🏠","👥","👨‍👩‍👧"].includes(b.icon));

  return (
    <>
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#9370DB]" />
            <h3 className="text-sm font-semibold">Sharing Modes</h3>
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="h-7 text-xs gap-1 bg-[#9370DB]/20 text-[#9370DB] hover:bg-[#9370DB]/30 border border-[#9370DB]/30">
            <Plus className="w-3 h-3" /> Create
          </Button>
        </div>

        {sharingBoards.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-[#8B8D97] mb-2">No shared boards yet</p>
            <div className="flex justify-center gap-2">
              {MODES.map(m => (
                <motion.button key={m.id} whileHover={{ scale: 1.08 }} onClick={() => { setSelectedMode(m.id); setOpen(true); }}
                  className="p-2 rounded-xl text-lg" style={{ background: `${m.color}15`, border: `1px solid ${m.color}30` }}>
                  {m.id === "couples" ? "❤️" : m.id === "roommates" ? "🏠" : m.id === "friends" ? "👥" : "👨‍👩‍👧"}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {sharingBoards.slice(0, 3).map(board => (
              <div key={board.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0F1117] border border-[#2A2D3A]">
                <div className="flex items-center gap-2">
                  <span className="text-base">{board.icon}</span>
                  <div>
                    <p className="text-xs font-medium">{board.name}</p>
                    <p className="text-[10px] text-[#8B8D97]">{board.members?.length || 0} members</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-[#9370DB] hover:bg-[#9370DB]/10"
                    onClick={() => sendReminder(board)} title="Send reminder">
                    <Bell className="w-3 h-3" />
                  </Button>
                  <Badge variant="outline" className="text-[9px] border-[#FFB6C1]/30 text-[#FFB6C1] gap-0.5 px-1.5 cursor-pointer">
                    <Gift className="w-2.5 h-2.5" /> Gift
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Sharing Board</DialogTitle>
          </DialogHeader>
          {created ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              <p className="text-sm font-semibold">Board Created!</p>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-2">
                {MODES.map(mode => {
                  const Icon = mode.icon;
                  return (
                    <button key={mode.id} onClick={() => setSelectedMode(mode.id)}
                      className="p-3 rounded-xl text-left transition-all"
                      style={{
                        background: selectedMode === mode.id ? `${mode.color}20` : "rgba(15,17,23,0.5)",
                        border: `1px solid ${selectedMode === mode.id ? mode.color : "#2A2D3A"}`,
                      }}>
                      <Icon className="w-4 h-4 mb-1.5" style={{ color: mode.color }} />
                      <p className="text-xs font-semibold">{mode.label}</p>
                      <p className="text-[10px] text-[#8B8D97]">{mode.description}</p>
                    </button>
                  );
                })}
              </div>
              <div>
                <p className="text-xs text-[#8B8D97] mb-1.5">Invite someone (optional)</p>
                <Input placeholder="friend@email.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] text-xs h-8" />
              </div>
              <Button onClick={handleCreate} disabled={!selectedMode || creating} className="w-full bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white text-sm">
                {creating ? "Creating..." : "Create Board"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}