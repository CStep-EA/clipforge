import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Globe, Lock } from "lucide-react";

const statusColors = {
  planned: "bg-[#8B8D97]/15 text-[#8B8D97] border-[#8B8D97]/30",
  in_progress: "bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/30",
  committed: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
  shipped: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
  cancelled: "bg-red-400/15 text-red-400 border-red-400/30",
};

export default function DevLogManager() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", status: "planned", category: "feature", priority: "medium", is_public: false });
  const queryClient = useQueryClient();

  const { data: logs = [] } = useQuery({
    queryKey: ["devLogs"],
    queryFn: () => base44.entities.DevLog.list("-created_date"),
  });

  const handleCreate = async () => {
    await base44.entities.DevLog.create(form);
    queryClient.invalidateQueries({ queryKey: ["devLogs"] });
    setOpen(false);
    setForm({ title: "", description: "", status: "planned", category: "feature", priority: "medium", is_public: false });
  };

  const updateStatus = async (id, status) => {
    await base44.entities.DevLog.update(id, { status });
    queryClient.invalidateQueries({ queryKey: ["devLogs"] });
  };

  const togglePublic = async (item) => {
    await base44.entities.DevLog.update(item.id, { is_public: !item.is_public });
    queryClient.invalidateQueries({ queryKey: ["devLogs"] });
  };

  const deleteLog = async (id) => {
    await base44.entities.DevLog.delete(id);
    queryClient.invalidateQueries({ queryKey: ["devLogs"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Dev Log / Roadmap</p>
          <p className="text-[10px] text-[#8B8D97]">Items marked public appear in user-facing roadmap</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-[#9370DB] to-[#00BFFF] text-white gap-1.5 text-xs">
          <Plus className="w-3 h-3" /> Add Item
        </Button>
      </div>

      <div className="space-y-2">
        {logs.map(log => (
          <Card key={log.id} className="glass-card p-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-medium truncate">{log.title}</p>
                  <Badge variant="outline" className={`text-[10px] ${statusColors[log.status]}`}>{log.status}</Badge>
                  <Badge variant="outline" className="text-[10px] border-[#2A2D3A] text-[#8B8D97] capitalize">{log.category}</Badge>
                  {log.is_public && <Badge variant="outline" className="text-[10px] border-emerald-400/30 text-emerald-400 gap-1"><Globe className="w-2 h-2" /> Public</Badge>}
                </div>
                {log.description && <p className="text-[10px] text-[#8B8D97] line-clamp-1">{log.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Select value={log.status} onValueChange={v => updateStatus(log.id, v)}>
                  <SelectTrigger className="h-6 w-28 text-[10px] bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                    {["planned","in_progress","committed","shipped","cancelled"].map(s => (
                      <SelectItem key={s} value={s} className="text-[#E8E8ED] text-xs capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => togglePublic(log)}
                  className="h-6 w-6 p-0 text-[#8B8D97] hover:text-emerald-400" title={log.is_public ? "Make private" : "Make public"}>
                  {log.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteLog(log.id)}
                  className="h-6 w-6 p-0 text-[#8B8D97] hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {logs.length === 0 && <p className="text-xs text-[#8B8D97] text-center py-6">No dev log items yet</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
          <DialogHeader>
            <DialogTitle className="gradient-text">Add Dev Log Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-[#8B8D97]">Title</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]" />
            </div>
            <div>
              <Label className="text-xs text-[#8B8D97]">Description</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] h-20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-[#8B8D97]">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                    {["planned","in_progress","committed","shipped"].map(s => (
                      <SelectItem key={s} value={s} className="text-[#E8E8ED] capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-[#8B8D97]">Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                    {["feature","bug_fix","improvement","security"].map(c => (
                      <SelectItem key={c} value={c} className="text-[#E8E8ED] capitalize">{c.replace("_"," ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_public" checked={form.is_public}
                onChange={e => setForm({...form, is_public: e.target.checked})}
                className="accent-[#00BFFF]" />
              <Label htmlFor="is_public" className="text-xs text-[#8B8D97] cursor-pointer">Show in public roadmap</Label>
            </div>
            <Button onClick={handleCreate} disabled={!form.title}
              className="w-full bg-gradient-to-r from-[#9370DB] to-[#00BFFF] text-white">
              Add to Dev Log
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}