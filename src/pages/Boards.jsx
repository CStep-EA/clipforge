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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shared Boards</h1>
          <p className="text-[#8B8D97] text-sm">Collaborate with your partner, roommates, or friends</p>
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
                  <Card className="glass-card p-5 hover:border-opacity-50 transition-all cursor-pointer group"
                        style={{ borderColor: `${board.color || "#00BFFF"}30` }}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{board.icon || "🏠"}</span>
                      {board.is_public ? (
                        <Globe className="w-4 h-4 text-[#8B8D97]" />
                      ) : (
                        <Lock className="w-4 h-4 text-[#8B8D97]" />
                      )}
                    </div>
                    <h3 className="font-semibold group-hover:text-[#00BFFF] transition-colors">{board.name}</h3>
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