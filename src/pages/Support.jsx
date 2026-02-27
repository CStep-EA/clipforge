import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  MessageCircle, Plus, Clock, CheckCircle2, Search, Bug, Lightbulb,
  BookOpen, Map, Shield, FileText, Sparkles, ChevronRight, Loader2, Edit3
} from "lucide-react";
import { motion } from "framer-motion";
import SupportBot from "@/components/support/SupportBot";
import TicketDetail from "@/components/support/TicketDetail";

const statusColors = {
  open: "bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/30",
  in_progress: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
  resolved: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
  closed: "bg-[#8B8D97]/15 text-[#8B8D97] border-[#8B8D97]/30",
};

const AI_DOC = `
## How ClipForge Uses AI – Transparency Whitepaper

**AI for Content Saves & Summaries**
When you save a URL or piece of content, ClipForge uses AI (large language models) to automatically generate a concise summary, suggest relevant tags, and assign a relevance score. This helps you quickly recall why you saved something weeks later. The AI processes only the content you explicitly save—it does not browse your history or monitor unrelated activity.

**AI for Smart Search**
Our AI-powered search understands natural language queries like "Italian recipes I saved last month" or "deals under $50". We use semantic embeddings to match your intent against your saved items, providing more relevant results than keyword search alone.

**AI for Event Reviews**
On the Events page, ClipForge uses AI (with optional real-time web context) to generate brief event reviews to help you decide whether to buy tickets. These are clearly labeled as AI-generated and should not replace your own research.

**AI Support Bot**
The in-app support bot is powered by a large language model and is designed to answer questions about ClipForge features. It is NOT a human agent. Responses may be inaccurate—always verify critical information. The bot may suggest creating a support ticket for complex issues, which routes to our human support team.

**Data Privacy in AI Processing**
- Your saved content is processed transiently for AI generation; we do not use it to train AI models
- We use reputable AI providers with data processing agreements aligned with GDPR
- AI-generated content is clearly marked with ✨ or 🤖 labels throughout the app
- You can disable AI summaries in Settings at any time

**Disclaimer**
AI-generated content in ClipForge is for informational purposes only and does not constitute legal, medical, financial, or professional advice.
`;

export default function Support() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({ subject: "", message: "", category: "general", priority: "medium" });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("tickets");

  // Pre-fill form with category shortcut
  const openTicketForm = (category, priority = "medium") => {
    setForm({ subject: "", message: "", category, priority });
    setCreateOpen(true);
  };
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {}).finally(() => setAuthLoading(false));
  }, []);

  const { data: tickets = [] } = useQuery({
    queryKey: ["supportTickets"],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
    enabled: !!user,
  });

  const { data: roadmap = [] } = useQuery({
    queryKey: ["publicRoadmap"],
    queryFn: () => base44.entities.DevLog.filter({ is_public: true }),
  });

  const handleCreate = async () => {
    setSaving(true);
    await base44.entities.SupportTicket.create(form);
    queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
    setCreateOpen(false);
    setSaving(false);
    setForm({ subject: "", message: "", category: "general", priority: "medium" });
  };

  const filteredTickets = tickets
    .filter(t => filterStatus === "all" || t.status === filterStatus)
    .filter(t => !searchQuery || t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || t.message?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00BFFF]" />
    </div>
  );

  if (!user) return (
    <div className="p-8 max-w-md mx-auto mt-20 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00BFFF]/20 to-[#9370DB]/20 flex items-center justify-center mx-auto">
        <MessageCircle className="w-8 h-8 text-[#00BFFF]" />
      </div>
      <h2 className="text-lg font-semibold">Sign in to access Support</h2>
      <p className="text-sm text-[#8B8D97]">You need to be logged in to create or track support tickets.</p>
      <Button onClick={() => base44.auth.redirectToLogin()} className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white">
        Sign In
      </Button>
    </div>
  );

  const roadmapStatusColors = {
    planned: "text-[#8B8D97]",
    in_progress: "text-[#00BFFF]",
    committed: "text-[#F59E0B]",
    shipped: "text-emerald-400",
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Support Center</h1>
          <p className="text-[#8B8D97] text-sm">Get help, track tickets, and read docs</p>
        </div>
        {user && (
          <Button onClick={() => setCreateOpen(true)}
            className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-2">
            <Plus className="w-4 h-4" /> New Ticket
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#1A1D27] border border-[#2A2D3A] flex-wrap h-auto gap-1 p-1">
          {user && (
            <TabsTrigger value="tickets" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF] gap-1.5 text-xs">
              <MessageCircle className="w-3.5 h-3.5" /> My Tickets
              {tickets.filter(t => t.status === "open").length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] text-[9px] font-bold">
                  {tickets.filter(t => t.status === "open").length}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="bot" className="data-[state=active]:bg-[#9370DB]/10 data-[state=active]:text-[#9370DB] gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5" /> AI Assistant
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF] gap-1.5 text-xs">
            <Map className="w-3.5 h-3.5" /> Roadmap
          </TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-[#9370DB]/10 data-[state=active]:text-[#9370DB] gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5" /> Documentation
          </TabsTrigger>
        </TabsList>

        {/* Tickets Tab */}
        {user && (
          <TabsContent value="tickets" className="mt-4 space-y-4">
            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => openTicketForm("bug", "high")}
                className="glass-card rounded-xl p-3 text-left hover:border-red-400/30 transition-all group">
                <Bug className="w-5 h-5 text-red-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold">Report Bug</p>
                <p className="text-[10px] text-[#8B8D97]">Something broken</p>
              </button>
              <button onClick={() => openTicketForm("feature_request", "low")}
                className="glass-card rounded-xl p-3 text-left hover:border-[#9370DB]/30 transition-all group">
                <Lightbulb className="w-5 h-5 text-[#9370DB] mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold">Suggest Feature</p>
                <p className="text-[10px] text-[#8B8D97]">Have an idea</p>
              </button>
              <button onClick={() => openTicketForm("general", "medium")}
                className="glass-card rounded-xl p-3 text-left hover:border-[#00BFFF]/30 transition-all group">
                <Edit3 className="w-5 h-5 text-[#00BFFF] mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold">General Help</p>
                <p className="text-[10px] text-[#8B8D97]">Any question</p>
              </button>
            </div>

            {/* Search + filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B8D97]" />
                <Input placeholder="Search tickets..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] h-9 text-sm placeholder:text-[#8B8D97]/50" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                  <SelectItem value="all" className="text-[#E8E8ED] text-xs">All Status</SelectItem>
                  <SelectItem value="open" className="text-[#E8E8ED] text-xs">Open</SelectItem>
                  <SelectItem value="in_progress" className="text-[#E8E8ED] text-xs">In Progress</SelectItem>
                  <SelectItem value="resolved" className="text-[#E8E8ED] text-xs">Resolved</SelectItem>
                  <SelectItem value="closed" className="text-[#E8E8ED] text-xs">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredTickets.length === 0 ? (
              <Card className="glass-card p-10 text-center">
                <MessageCircle className="w-10 h-10 text-[#9370DB] mx-auto mb-3" />
                <h3 className="font-semibold mb-2">{tickets.length === 0 ? "No tickets yet" : "No matching tickets"}</h3>
                <p className="text-sm text-[#8B8D97] mb-4">{tickets.length === 0 ? "Or try our AI bot for instant answers" : "Try adjusting your filters"}</p>
                {tickets.length === 0 && (
                  <Button size="sm" onClick={() => setActiveTab("bot")} variant="outline" className="border-[#9370DB]/30 text-[#9370DB] gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Try AI Assistant
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredTickets.map((ticket, i) => (
                  <motion.div key={ticket.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card
                      className="glass-card p-4 cursor-pointer hover:border-[#00BFFF]/30 transition-all group"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-medium text-sm truncate group-hover:text-[#00BFFF] transition-colors">{ticket.subject}</h3>
                            <Badge variant="outline" className={`text-[10px] ${statusColors[ticket.status]}`}>{ticket.status}</Badge>
                            <Badge variant="outline" className="text-[10px] border-[#2A2D3A] text-[#8B8D97] capitalize">{ticket.category}</Badge>
                          </div>
                          <p className="text-xs text-[#8B8D97] line-clamp-1">{ticket.message}</p>
                          {ticket.response && (
                            <p className="text-[10px] text-[#00BFFF] mt-1">✓ Response received</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-[#8B8D97] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(ticket.created_date).toLocaleDateString()}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#8B8D97] group-hover:text-[#00BFFF] transition-colors" />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* AI Bot Tab */}
        <TabsContent value="bot" className="mt-4">
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[#9370DB]/5 border border-[#9370DB]/20 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#9370DB] shrink-0 mt-0.5" />
              <div className="text-xs text-[#8B8D97] leading-relaxed">
                <strong className="text-[#E8E8ED]">AI Support Bot</strong> — answers questions about ClipForge instantly. For issues needing human review, click <strong className="text-[#FFB6C1]">Human</strong> in the chat header to escalate and auto-create a ticket with your conversation context. <em>AI responses are for informational purposes only.</em>
              </div>
            </div>
            <SupportBot user={user} floating={false} />
          </div>
        </TabsContent>

        {/* Roadmap Tab */}
        <TabsContent value="roadmap" className="mt-4 space-y-3">
          <p className="text-xs text-[#8B8D97]">Features our team is actively working on or has committed to shipping</p>
          {roadmap.length === 0 ? (
            <Card className="glass-card p-8 text-center">
              <Map className="w-8 h-8 text-[#9370DB] mx-auto mb-3" />
              <p className="text-sm text-[#8B8D97]">No public roadmap items yet — check back soon!</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {roadmap.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="glass-card p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        item.status === "shipped" ? "bg-emerald-400" :
                        item.status === "committed" ? "bg-[#F59E0B]" :
                        item.status === "in_progress" ? "bg-[#00BFFF] animate-pulse" : "bg-[#8B8D97]"
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{item.title}</p>
                          <span className={`text-[10px] font-semibold capitalize ${roadmapStatusColors[item.status] || "text-[#8B8D97]"}`}>
                            {item.status?.replace("_", " ")}
                          </span>
                          <Badge variant="outline" className="text-[10px] border-[#2A2D3A] text-[#8B8D97] capitalize">{item.category?.replace("_"," ")}</Badge>
                        </div>
                        {item.description && <p className="text-xs text-[#8B8D97] mt-0.5">{item.description}</p>}
                        {item.eta && <p className="text-[10px] text-[#8B8D97] mt-1">ETA: {new Date(item.eta).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Docs Tab */}
        <TabsContent value="docs" className="mt-4 space-y-4">
          {/* Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link to={createPageUrl("Privacy")} className="glass-card rounded-xl p-4 hover:border-[#00BFFF]/30 transition-all flex items-center gap-3 group">
              <Shield className="w-5 h-5 text-[#00BFFF] group-hover:scale-110 transition-transform" />
              <div>
                <p className="text-xs font-semibold">Privacy Policy</p>
                <p className="text-[10px] text-[#8B8D97]">GDPR, COPPA, data use</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#8B8D97] ml-auto" />
            </Link>
            <Link to={createPageUrl("Terms")} className="glass-card rounded-xl p-4 hover:border-[#9370DB]/30 transition-all flex items-center gap-3 group">
              <FileText className="w-5 h-5 text-[#9370DB] group-hover:scale-110 transition-transform" />
              <div>
                <p className="text-xs font-semibold">Terms of Service</p>
                <p className="text-[10px] text-[#8B8D97]">Usage & billing terms</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#8B8D97] ml-auto" />
            </Link>
            <a href="#ai-whitepaper" className="glass-card rounded-xl p-4 hover:border-[#FFB6C1]/30 transition-all flex items-center gap-3 group">
              <Sparkles className="w-5 h-5 text-[#FFB6C1] group-hover:scale-110 transition-transform" />
              <div>
                <p className="text-xs font-semibold">AI Transparency</p>
                <p className="text-[10px] text-[#8B8D97]">How AI is used</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#8B8D97] ml-auto" />
            </a>
          </div>

          {/* AI Whitepaper */}
          <div id="ai-whitepaper" className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FFB6C1]" />
              <h2 className="font-semibold">AI Transparency Whitepaper</h2>
            </div>
            <div className="prose prose-sm max-w-none text-[#8B8D97] space-y-3">
              {AI_DOC.trim().split("\n\n").map((paragraph, i) => {
                if (paragraph.startsWith("##")) {
                  return <h3 key={i} className="text-base font-bold text-[#E8E8ED] mt-4">{paragraph.replace("## ", "")}</h3>;
                }
                if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
                  return <p key={i} className="text-sm font-semibold text-[#E8E8ED]">{paragraph.replace(/\*\*/g, "")}</p>;
                }
                return (
                  <div key={i} className="text-sm leading-relaxed">
                    {paragraph.split("\n").map((line, j) => (
                      <p key={j} className={line.startsWith("•") ? "ml-3" : ""}>{line}</p>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Ticket Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
          <DialogHeader>
            <DialogTitle className="gradient-text">New Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-[#8B8D97]">Subject</Label>
              <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]" placeholder="Brief description of your issue" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-[#8B8D97]">Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                    <SelectItem value="general" className="text-[#E8E8ED]">General</SelectItem>
                    <SelectItem value="bug" className="text-[#E8E8ED]">Bug Report</SelectItem>
                    <SelectItem value="feature_request" className="text-[#E8E8ED]">Feature Request</SelectItem>
                    <SelectItem value="billing" className="text-[#E8E8ED]">Billing</SelectItem>
                    <SelectItem value="account" className="text-[#E8E8ED]">Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-[#8B8D97]">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
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
              <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] h-28"
                placeholder="Describe your issue in detail..." />
            </div>
            <Button onClick={handleCreate} disabled={!form.subject || !form.message || saving}
              className="w-full bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail */}
      <TicketDetail
        ticket={selectedTicket}
        open={!!selectedTicket}
        onOpenChange={open => { if (!open) setSelectedTicket(null); }}
      />
    </div>
  );
}