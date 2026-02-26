import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Users, Lock, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const boardColors = ["#00BFFF", "#9370DB", "#FFB6C1", "#10B981", "#F59E0B", "#EC4899"];
const boardIcons = ["🏠", "❤️", "🎁", "🍽️", "✈️", "📚", "🎬", "🛍️"];

export default function Boards() {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", icon: "🏠", color: "#00BFFF", members: [] });
  const [memberInput, setMemberInput] = useState("");
  const queryClient = useQueryClient();

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
    setForm({ name: "", description: "", icon: "🏠", color: "#00BFFF", members: [] });
  };

  const addMember = () => {
    if (memberInput.trim() && !form.members.includes(memberInput.trim())) {
      setForm(prev => ({ ...prev, members: [...prev.members, memberInput.trim()] }));
      setMemberInput("");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 relative">
      {/* Y2K animated gradient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 y2k-pattern opacity-60" />
      <div className="pointer-events-none fixed inset-0 -z-10 y2k-bg opacity-50" />
      <div className="pointer-events-none fixed top-0 right-0 w-96 h-96 rounded-full bg-[#9370DB]/8 blur-3xl -z-10 animate-float-slow" />
      <div className="pointer-events-none fixed bottom-0 left-0 w-80 h-80 rounded-full bg-[#00BFFF]/8 blur-3xl -z-10 animate-float-slow" style={{ animationDelay: "2s" }} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Shared Boards</h1>
          <p className="text-[#8B8D97] text-sm font-medium mt-0.5">Collaborate with your partner, roommates, or friends</p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-gradient-to-r from-[#9370DB] to-[#FFB6C1] text-white gap-2 font-bold animate-btn-pulse-purple"
          >
            <Plus className="w-4 h-4" /> New Board
          </Button>
        </motion.div>
      </div>

      {boards.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-[#9370DB] mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No boards yet</h3>
          <p className="text-[#8B8D97] text-sm mb-4">Create a board to share saves with others</p>
          <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-[#9370DB] to-[#FFB6C1] text-white">
            Create First Board
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board, i) => {
            const boardItemCount = allItems.filter(item => item.board_id === board.id).length;
            return (
              <motion.div
                key={board.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={createPageUrl(`Saves?board=${board.id}`)}>
                  <Card
                    className="glass-card p-5 transition-all duration-300 cursor-pointer group hover:shadow-[0_0_28px_rgba(0,191,255,0.15),0_0_8px_rgba(147,112,219,0.1)] hover:-translate-y-1"
                    style={{ borderColor: `${board.color || "#00BFFF"}30` }}
                  >
                    {/* Y2K shimmer on hover */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shimmer-bg pointer-events-none" />
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl group-hover:scale-110 transition-transform duration-200 inline-block">{board.icon || "🏠"}</span>
                      {board.is_public ? (
                        <Globe className="w-4 h-4 text-[#8B8D97]" />
                      ) : (
                        <Lock className="w-4 h-4 text-[#8B8D97]" />
                      )}
                    </div>
                    <h3 className="font-black text-base group-hover:text-[#00BFFF] transition-colors">{board.name}</h3>
                    {board.description && (
                      <p className="text-xs text-[#8B8D97] mt-1 line-clamp-2">{board.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#2A2D3A]">
                      <span className="text-xs text-[#8B8D97]">
                        {board.members?.length || 0} members
                      </span>
                      <span className="text-xs text-[#8B8D97]">
                        {boardItemCount} saves
                      </span>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create board dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
          <DialogHeader>
            <DialogTitle className="gradient-text">Create Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-[#8B8D97]">Board Name</Label>
              <Input
                placeholder="e.g., Date Night Ideas"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8B8D97]">Icon</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {boardIcons.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setForm({ ...form, icon })}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all
                      ${form.icon === icon ? "bg-[#00BFFF]/20 ring-2 ring-[#00BFFF]" : "bg-[#0F1117] hover:bg-[#2A2D3A]"}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-[#8B8D97]">Color</Label>
              <div className="flex gap-2 mt-1">
                {boardColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    className={`w-8 h-8 rounded-full transition-all ${form.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#1A1D27]" : ""}`}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-[#8B8D97]">Add Members (email)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="email@example.com"
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMember())}
                  className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
                />
                <Button variant="outline" onClick={addMember} className="border-[#2A2D3A] text-[#E8E8ED]">
                  Add
                </Button>
              </div>
              {form.members.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.members.map((m, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[#9370DB]/15 text-[#9370DB] cursor-pointer hover:bg-red-500/20 hover:text-red-400"
                      onClick={() => setForm(prev => ({ ...prev, members: prev.members.filter((_, j) => j !== i) }))}
                    >
                      {m} ×
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button
              onClick={handleCreate}
              disabled={!form.name}
              className="w-full bg-gradient-to-r from-[#9370DB] to-[#FFB6C1] text-white"
            >
              Create Board
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}