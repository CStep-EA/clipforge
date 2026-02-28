import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckCircle2, XCircle, MessageSquare, Send, User, Headphones } from "lucide-react";
import { toast } from "sonner";

const statusColors = {
  open: "bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/30",
  in_progress: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
  resolved: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
  closed: "bg-[#8B8D97]/15 text-[#8B8D97] border-[#8B8D97]/30",
};

const priorityColors = {
  low: "text-[#8B8D97]",
  medium: "text-[#F59E0B]",
  high: "text-orange-400",
  urgent: "text-red-400",
};

// Parse comment thread stored in response field as JSON array, or treat as legacy string
function parseComments(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  // Legacy: single string response
  return [{ role: "support", text: raw, ts: null }];
}

function serializeComments(comments) {
  return JSON.stringify(comments);
}

export default function TicketDetail({ ticket, open, onOpenChange, isAdmin = false }) {
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  if (!ticket) return null;

  const comments = parseComments(ticket.response);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSaving(true);
    const newComment = {
      role: isAdmin ? "support" : "user",
      text: reply,
      ts: new Date().toISOString(),
    };
    const updated = [...comments, newComment];
    await base44.entities.SupportTicket.update(ticket.id, {
      response: serializeComments(updated),
      status: isAdmin ? "in_progress" : ticket.status,
    });
    queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
    queryClient.invalidateQueries({ queryKey: ["allTickets"] });
    setReply("");
    setSaving(false);
    toast.success(isAdmin ? "Response sent" : "Follow-up added");
  };

  const handleStatusChange = async (status) => {
    await base44.entities.SupportTicket.update(ticket.id, { status });
    queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
    queryClient.invalidateQueries({ queryKey: ["allTickets"] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug pr-4">{ticket.subject}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={statusColors[ticket.status]}>{ticket.status}</Badge>
            <Badge variant="outline" className="text-[10px] border-[#2A2D3A] text-[#8B8D97] capitalize">{ticket.category}</Badge>
            <span className={`text-[10px] font-semibold capitalize ${priorityColors[ticket.priority]}`}>
              {ticket.priority} priority
            </span>
            <span className="text-[10px] text-[#8B8D97] ml-auto flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(ticket.created_date).toLocaleDateString()}
            </span>
          </div>

          {/* Original message */}
          <div className="p-3 rounded-xl bg-[#0F1117] border border-[#2A2D3A]">
            <p className="text-[10px] text-[#8B8D97] font-medium mb-1.5 flex items-center gap-1">
              <User className="w-3 h-3" /> Your message
            </p>
            <p className="text-sm text-[#E8E8ED] leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
          </div>

          {/* Comment thread */}
          {comments.length > 0 && (
            <div className="space-y-2">
              {comments.map((c, i) => (
                <div key={i} className={`p-3 rounded-xl text-xs leading-relaxed ${
                  c.role === "support"
                    ? "bg-[#00BFFF]/5 border border-[#00BFFF]/20"
                    : "bg-[#9370DB]/5 border border-[#9370DB]/20"
                }`}>
                  <p className={`text-[10px] font-semibold mb-1 flex items-center gap-1 ${c.role === "support" ? "text-[#00BFFF]" : "text-[#9370DB]"}`}>
                    {c.role === "support" ? <Headphones className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {c.role === "support" ? "ClipForge Support" : "You"}
                    {c.ts && <span className="ml-auto text-[#8B8D97] font-normal">{new Date(c.ts).toLocaleString()}</span>}
                  </p>
                  <p className="text-[#E8E8ED] whitespace-pre-wrap">{c.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Admin controls */}
          {isAdmin && (
            <div>
              <p className="text-xs text-[#8B8D97] mb-1.5">Update Status</p>
              <Select value={ticket.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                  <SelectItem value="open" className="text-[#E8E8ED] text-xs">Open</SelectItem>
                  <SelectItem value="in_progress" className="text-[#E8E8ED] text-xs">In Progress</SelectItem>
                  <SelectItem value="resolved" className="text-[#E8E8ED] text-xs">Resolved</SelectItem>
                  <SelectItem value="closed" className="text-[#E8E8ED] text-xs">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reply area */}
          {ticket.status !== "closed" && (
            <div className="space-y-2">
              <Textarea
                placeholder={isAdmin ? "Write a response to the user..." : "Add a follow-up message..."}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] h-24 text-sm placeholder:text-[#8B8D97]/50"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={!reply.trim() || saving}
                  className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-1.5 text-xs"
                >
                  <Send className="w-3 h-3" />
                  {isAdmin ? "Send Response" : "Send"}
                </Button>
                {ticket.status !== "closed" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleStatusChange("closed")}
                    className="text-[#8B8D97] hover:text-red-400 gap-1.5 text-xs"
                  >
                    <XCircle className="w-3 h-3" /> Close Ticket
                  </Button>
                )}
              </div>
            </div>
          )}
          {ticket.status === "closed" && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4" /> This ticket is closed
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}