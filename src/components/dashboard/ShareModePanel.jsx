import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Heart, Home, Gift, User2, Bell, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const MODES = [
  { id: "couple", label: "Couple", icon: Heart, color: "#FFB6C1", desc: "Share wish lists & date ideas" },
  { id: "roommates", label: "Roommates", icon: Home, color: "#00BFFF", desc: "Split shopping & household finds" },
  { id: "friends", label: "Friends", icon: Users, color: "#9370DB", desc: "Plan events & group gifts" },
  { id: "family", label: "Family", icon: User2, color: "#10B981", desc: "Gift ideas & recipes for everyone" },
];

export default function ShareModePanel({ items = [] }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const giftItems = items.filter(i => i.category === "gift_idea" || i.is_favorite);

  const handleShare = async () => {
    if (!email || !mode) return;
    setSending(true);
    const modeLabel = MODES.find(m => m.id === mode)?.label || mode;
    const itemTitles = giftItems.slice(0, 5).map(i => `• ${i.title}`).join("\n");
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `${modeLabel} ClipForge List — Shared with you!`,
      body: `Hey! I shared a list with you on ClipForge (${modeLabel} mode).\n\nTop picks:\n${itemTitles}\n\nView them all on ClipForge.`
    });
    setSent(true);
    setSending(false);
    setTimeout(() => { setSent(false); setEmail(""); setOpen(false); }, 2000);
  };

  const flaggedGifts = items.filter(i => i.category === "gift_idea");

  return (
    <>
      <Card className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#9370DB]" />
            <h3 className="text-sm font-semibold">Share Mode</h3>
            {flaggedGifts.length > 0 && (
              <Badge className="bg-[#FFB6C1]/10 text-[#FFB6C1] border-[#FFB6C1]/20 text-[10px]">
                <Gift className="w-2.5 h-2.5 mr-1" />{flaggedGifts.length} gift ideas
              </Badge>
            )}
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="h-7 text-xs bg-[#9370DB]/10 border border-[#9370DB]/30 text-[#9370DB] hover:bg-[#9370DB]/20">
            Share List
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MODES.map(m => {
            const Icon = m.icon;
            return (
              <motion.button
                key={m.id}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => { setMode(m.id); setOpen(true); }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[#2A2D3A] hover:border-opacity-60 transition-all text-center"
                style={{ borderColor: mode === m.id ? `${m.color}50` : "" }}
              >
                <Icon className="w-5 h-5" style={{ color: m.color }} />
                <span className="text-xs font-medium">{m.label}</span>
                <span className="text-[10px] text-[#8B8D97] leading-tight">{m.desc}</span>
              </motion.button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-[#F59E0B]/5 border border-[#F59E0B]/20">
          <Bell className="w-3.5 h-3.5 text-[#F59E0B] flex-shrink-0" />
          <p className="text-[10px] text-[#8B8D97]">Reminder emails sent when you share — push notifications coming soon.</p>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#9370DB]" /> Share Your List
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-2">
              {MODES.map(m => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className="flex items-center gap-2 p-3 rounded-xl border transition-all text-left"
                    style={{
                      borderColor: mode === m.id ? m.color : "#2A2D3A",
                      background: mode === m.id ? `${m.color}10` : ""
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: m.color }} />
                    <span className="text-sm font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>
            {flaggedGifts.length > 0 && (
              <div className="p-3 rounded-xl bg-[#FFB6C1]/5 border border-[#FFB6C1]/20">
                <p className="text-xs text-[#FFB6C1] font-medium mb-1 flex items-center gap-1"><Gift className="w-3 h-3" /> {flaggedGifts.length} Gift Ideas flagged</p>
                <p className="text-[10px] text-[#8B8D97]">{flaggedGifts.slice(0, 3).map(i => i.title).join(", ")}{flaggedGifts.length > 3 ? "..." : ""}</p>
              </div>
            )}
            <div>
              <Input
                placeholder="Friend's email address..."
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
              />
            </div>
            <Button
              onClick={handleShare}
              disabled={!email || !mode || sending}
              className="w-full bg-gradient-to-r from-[#9370DB] to-[#FFB6C1] text-white font-bold"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : sent ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
              {sent ? "Shared!" : "Send & Notify"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}