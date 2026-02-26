import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

const priorityColors = { low: "#8B8D97", medium: "#F59E0B", high: "#EF4444", urgent: "#FF0000" };
const statusColors = { open: "#F59E0B", in_progress: "#00BFFF", resolved: "#10B981", closed: "#8B8D97" };

export default function AdminTickets() {
  const [responding, setResponding] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["allTickets"],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
  });

  const handleAIDraft = async (ticket) => {
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a friendly support agent for ClipForge, a social media content saving & organization app. Draft a helpful, empathetic response to this support ticket:

Subject: ${ticket.subject}
Category: ${ticket.category}
Priority: ${ticket.priority}
Message: ${ticket.message}

Write a concise, professional response (3-5 sentences). Acknowledge their issue, provide a helpful solution or next step, and close warmly.`,
    });
    setResponseText(result);
    setGenerating(false);
  };

  const handleRespond = async (ticket) => {
    await base44.entities.SupportTicket.update(ticket.id, {
      response: responseText,
      status: "resolved",
    });
    setResponding(null);
    setResponseText("");
    queryClient.invalidateQueries({ queryKey: ["allTickets"] });
  };

  const updateStatus = async (ticket, status) => {
    await base44.entities.SupportTicket.update(ticket.id, { status });
    queryClient.invalidateQueries({ queryKey: ["allTickets"] });
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#00BFFF]" /></div>;

  return (
    <Card className="glass-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-[#2A2D3A]">
            <TableHead className="text-[#8B8D97]">Subject</TableHead>
            <TableHead className="text-[#8B8D97]">Category</TableHead>
            <TableHead className="text-[#8B8D97]">Priority</TableHead>
            <TableHead className="text-[#8B8D97]">Status</TableHead>
            <TableHead className="text-[#8B8D97]">Date</TableHead>
            <TableHead className="text-[#8B8D97]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-[#8B8D97] py-10">No tickets yet</TableCell></TableRow>
          ) : tickets.map(ticket => (
            <React.Fragment key={ticket.id}>
              <TableRow className="border-[#2A2D3A] hover:bg-[#1A1D27]">
                <TableCell className="font-medium text-sm max-w-[200px] truncate">{ticket.subject}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] text-[#8B8D97] border-[#2A2D3A]">{ticket.category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]" style={{ color: priorityColors[ticket.priority], borderColor: `${priorityColors[ticket.priority]}40` }}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select value={ticket.status} onValueChange={(v) => updateStatus(ticket, v)}>
                    <SelectTrigger className="w-28 h-7 text-xs bg-transparent border-[#2A2D3A]" style={{ color: statusColors[ticket.status] }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-xs text-[#8B8D97]">
                  {new Date(ticket.created_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-xs border-[#2A2D3A] gap-1"
                    onClick={() => { setResponding(responding?.id === ticket.id ? null : ticket); setResponseText(""); }}
                  >
                    {responding?.id === ticket.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Respond
                  </Button>
                </TableCell>
              </TableRow>
              {responding?.id === ticket.id && (
                <TableRow className="border-[#2A2D3A] bg-[#1A1D27]/50">
                  <TableCell colSpan={6}>
                    <div className="p-4 space-y-3">
                      <div className="p-3 rounded-lg bg-[#0F1117] border border-[#2A2D3A]">
                        <p className="text-xs text-[#8B8D97] font-medium mb-1">User message:</p>
                        <p className="text-sm text-[#E8E8ED]">{ticket.message}</p>
                      </div>
                      {ticket.response && (
                        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                          <p className="text-xs text-emerald-400 font-medium mb-1">Previous response:</p>
                          <p className="text-sm text-[#E8E8ED]">{ticket.response}</p>
                        </div>
                      )}
                      <Textarea
                        placeholder="Type your response..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] h-24 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAIDraft(ticket)} variant="outline"
                          className="border-[#9370DB]/40 text-[#9370DB] hover:bg-[#9370DB]/10 gap-1" disabled={generating}>
                          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          AI Draft
                        </Button>
                        <Button size="sm" onClick={() => handleRespond(ticket)}
                          className="bg-[#00BFFF] text-white gap-1" disabled={!responseText}>
                          <Send className="w-3 h-3" /> Send & Resolve
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}