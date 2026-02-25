import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MessageCircle, Plus, Clock, CheckCircle2 } from "lucide-react";

const statusColors = {
  open: "bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/30",
  in_progress: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
  resolved: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
  closed: "bg-[#8B8D97]/15 text-[#8B8D97] border-[#8B8D97]/30",
};

export default function Support() {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "", category: "general", priority: "medium" });
  const queryClient = useQueryClient();

  const { data: tickets = [] } = useQuery({
    queryKey: ["supportTickets"],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
  });

  const handleCreate = async () => {
    await base44.entities.SupportTicket.create(form);
    queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
    setCreateOpen(false);
    setForm({ subject: "", message: "", category: "general", priority: "medium" });
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support</h1>
          <p className="text-[#8B8D97] text-sm">Get help or report issues</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-2">
          <Plus className="w-4 h-4" /> New Ticket
        </Button>
      </div>

      {tickets.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <MessageCircle className="w-10 h-10 text-[#9370DB] mx-auto mb-3" />
          <h3 className="font-semibold mb-2">No tickets yet</h3>
          <p className="text-sm text-[#8B8D97]">Create a ticket if you need help</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <Card key={ticket.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm">{ticket.subject}</h3>
                    <Badge variant="outline" className={statusColors[ticket.status]}>{ticket.status}</Badge>
                  </div>
                  <p className="text-xs text-[#8B8D97] line-clamp-2">{ticket.message}</p>
                  {ticket.response && (
                    <div className="mt-3 p-3 rounded-xl bg-[#00BFFF]/5 border border-[#00BFFF]/20">
                      <p className="text-xs text-[#00BFFF] font-medium mb-1">Response</p>
                      <p className="text-xs text-[#8B8D97]">{ticket.response}</p>
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-[#8B8D97] flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(ticket.created_date).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
          <DialogHeader>
            <DialogTitle className="gradient-text">New Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-[#8B8D97]">Subject</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-[#8B8D97]">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                    <SelectItem value="general" className="text-[#E8E8ED]">General</SelectItem>
                    <SelectItem value="bug" className="text-[#E8E8ED]">Bug</SelectItem>
                    <SelectItem value="feature_request" className="text-[#E8E8ED]">Feature</SelectItem>
                    <SelectItem value="billing" className="text-[#E8E8ED]">Billing</SelectItem>
                    <SelectItem value="account" className="text-[#E8E8ED]">Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-[#8B8D97]">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                    <SelectItem value="low" className="text-[#E8E8ED]">Low</SelectItem>
                    <SelectItem value="medium" className="text-[#E8E8ED]">Medium</SelectItem>
                    <SelectItem value="high" className="text-[#E8E8ED]">High</SelectItem>
                    <SelectItem value="urgent" className="text-[#E8E8ED]">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-[#8B8D97]">Message</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] h-28"
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={!form.subject || !form.message}
              className="w-full bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white"
            >
              Submit Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}