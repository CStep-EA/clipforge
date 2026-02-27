import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, Loader2, Ticket, ChevronDown, HandHeart, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const SYSTEM_PROMPT = `You are the ClipForge AI Support Assistant. You help users with:
- How to use ClipForge features (saves, boards, friends, integrations, streaming platforms, subscriptions)
- Troubleshooting common issues with the app
- Explaining pricing plans: Free (limited saves), Pro ($7.99/mo - unlimited saves, AI research, friends), Premium ($14.99/mo - streaming integrations, advanced AI), Family ($19.99/mo - 6 members, parental controls)
- Privacy policy: we collect only minimal data, encrypted at rest, GDPR/COPPA compliant, no PHI stored
- Terms of service: auto-renewing subscriptions, cancel anytime, no refunds for partial months

FAQ:
Q: How do I save content? A: Click "Quick Save" on the dashboard or use the Add button on the Saves page. Paste any URL or add manually.
Q: How do sharing boards work? A: Create a board, add members by email, and they can view/contribute saves.
Q: What streaming platforms can I connect? A: Discord, Twitch, YouTube, Spotify (Premium required for most).
Q: How do I invite family members? A: Go to Settings > Family Accounts (requires Family plan).
Q: Can I cancel my subscription? A: Yes, anytime in Settings > Billing. Access continues until period ends.

If the user describes a complex bug, account issue, billing problem, or something you cannot resolve — say you're escalating and that a support ticket will help a human agent assist them faster.

Keep answers to 2-4 sentences. Be friendly, concise, and helpful. Start responses with a relevant emoji.`;

const ESCALATION_TRIGGERS = [
  "create ticket", "report bug", "not working", "broken", "error", "crash",
  "can't login", "cannot login", "lost data", "charged wrong", "billing issue",
  "refund", "account deleted", "escalate", "human", "speak to someone", "real person",
  "complex", "urgent", "data breach", "security issue"
];

const detectEscalation = (text) =>
  ESCALATION_TRIGGERS.some(t => text.toLowerCase().includes(t));

const guessCategory = (text) => {
  const t = text.toLowerCase();
  if (t.includes("billing") || t.includes("charge") || t.includes("refund") || t.includes("payment")) return "billing";
  if (t.includes("bug") || t.includes("crash") || t.includes("broken") || t.includes("error")) return "bug";
  if (t.includes("feature") || t.includes("suggestion") || t.includes("wish") || t.includes("would be nice")) return "feature_request";
  if (t.includes("account") || t.includes("login") || t.includes("password")) return "account";
  return "general";
};

const guessPriority = (text) => {
  const t = text.toLowerCase();
  if (t.includes("urgent") || t.includes("data loss") || t.includes("security") || t.includes("breach")) return "urgent";
  if (t.includes("billing") || t.includes("charge") || t.includes("can't login")) return "high";
  return "medium";
};

export default function SupportBot({ user, floating = false }) {
  const [open, setOpen] = useState(!floating);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "👋 Hi! I'm the ClipForge support bot. Ask me anything about the app, or describe an issue and I'll help resolve it or escalate to our team!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketDraft, setTicketDraft] = useState(null);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async (overrideInput) => {
    const userMsg = (overrideInput || input).trim();
    if (!userMsg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(-8).map(m =>
        `${m.role === "user" ? "User" : "Bot"}: ${m.content}`
      ).join("\n");

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${SYSTEM_PROMPT}\n\nConversation:\n${history}\n\nUser: ${userMsg}\n\nAssistant:`,
      });

      setMessages(prev => [...prev, { role: "assistant", content: response }]);

      // Auto-suggest ticket if user message or bot response signals escalation needed
      const botSignalsEscalation = response.toLowerCase().includes("ticket") ||
        response.toLowerCase().includes("our team") ||
        response.toLowerCase().includes("escalat");

      if ((detectEscalation(userMsg) || botSignalsEscalation) && !ticketDraft) {
        setTicketDraft({
          subject: userMsg.slice(0, 80),
          message: `[Via AI Support Bot]\n\nUser message: ${userMsg}\n\nBot response: ${response}`,
          category: guessCategory(userMsg),
          priority: guessPriority(userMsg),
        });
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ I had trouble connecting. Please try again or create a support ticket directly."
      }]);
    }
    setLoading(false);
  };

  const handleCreateTicket = async () => {
    if (!ticketDraft) return;
    setCreatingTicket(true);
    try {
      await base44.entities.SupportTicket.create(ticketDraft);
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
      setTicketDraft(null);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "✅ Support ticket created! Our team will review it and respond via the Support page. You can track progress there anytime."
      }]);
      toast.success("Support ticket created — track it in Support");
    } catch {
      toast.error("Failed to create ticket. Please visit the Support page directly.");
    }
    setCreatingTicket(false);
  };

  const handleEscalateToHuman = async () => {
    setEscalated(true);
    // Create a ticket with escalation flag and full conversation context
    const convoContext = messages.map(m => `${m.role === "user" ? "User" : "Bot"}: ${m.content}`).join("\n");
    try {
      await base44.entities.SupportTicket.create({
        subject: "Escalated to Human — AI Bot Conversation",
        message: `[Human Handoff Requested]\n\nConversation context:\n${convoContext}`,
        category: "general",
        priority: "high",
      });
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "🙋 Got it! I've flagged this for a human agent and created a ticket with our full conversation. Our team will follow up via the Support page soon. Thank you for your patience!"
      }]);
      toast.success("Escalated to human support");
    } catch {
      toast.error("Escalation failed — please create a ticket in Support.");
    }
  };

  const quickPrompts = [
    "How do I save a link?",
    "What's included in Pro?",
    "My sync isn't working",
  ];

  const chat = (
    <div className={`flex flex-col ${floating ? "h-[460px] w-[350px]" : "h-full min-h-[400px]"}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#2A2D3A] bg-gradient-to-r from-[#00BFFF]/10 to-[#9370DB]/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#00BFFF] to-[#9370DB] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">AI Support</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="flex items-center gap-1">
          {!escalated && (
            <button
              onClick={handleEscalateToHuman}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-[#8B8D97] hover:text-[#FFB6C1] hover:bg-[#FFB6C1]/10 transition-all"
              title="Talk to a human agent"
            >
              <HandHeart className="w-3 h-3" /> Human
            </button>
          )}
          {floating && (
            <button onClick={() => setOpen(false)} className="text-[#8B8D97] hover:text-[#E8E8ED] p-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
              m.role === "user"
                ? "bg-gradient-to-r from-[#00BFFF]/20 to-[#9370DB]/20 text-[#E8E8ED]"
                : "bg-[#1A1D27] border border-[#2A2D3A] text-[#8B8D97]"
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1A1D27] border border-[#2A2D3A] px-3 py-2 rounded-2xl flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9370DB] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#9370DB] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#9370DB] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {/* Quick prompts — show only at start */}
        {messages.length === 1 && !loading && (
          <div className="flex flex-col gap-1.5 pt-1">
            {quickPrompts.map(p => (
              <button key={p} onClick={() => sendMessage(p)}
                className="text-left px-3 py-2 rounded-xl text-[10px] bg-[#1A1D27] border border-[#2A2D3A] text-[#8B8D97] hover:text-[#00BFFF] hover:border-[#00BFFF]/30 transition-all">
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Ticket suggestion */}
        <AnimatePresence>
          {ticketDraft && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-3 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20 space-y-2">
              <p className="text-[10px] text-[#F59E0B] font-semibold flex items-center gap-1">
                <Ticket className="w-3 h-3" /> Want to create a support ticket?
              </p>
              <p className="text-[10px] text-[#8B8D97]">Our team can look into this directly.</p>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={handleCreateTicket} disabled={creatingTicket}
                  className="h-6 text-[10px] bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 hover:bg-[#F59E0B]/30 px-2.5">
                  {creatingTicket ? <Loader2 className="w-3 h-3 animate-spin" /> : "✓ Create Ticket"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setTicketDraft(null)}
                  className="h-6 text-[10px] text-[#8B8D97] px-2">Dismiss</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Escalated confirmation */}
        {escalated && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FFB6C1]/5 border border-[#FFB6C1]/20">
            <AlertCircle className="w-3.5 h-3.5 text-[#FFB6C1] shrink-0" />
            <p className="text-[10px] text-[#FFB6C1]">Escalated to human support. Track your ticket in the <Link to={createPageUrl("Support")} className="underline">Support page</Link>.</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#2A2D3A] flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask anything..."
          className="flex-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] text-xs h-8 placeholder:text-[#8B8D97]/50"
        />
        <Button size="sm" onClick={() => sendMessage()} disabled={!input.trim() || loading}
          className="h-8 px-2.5 bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white">
          <Send className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );

  if (!floating) return <div className="glass-card rounded-2xl overflow-hidden">{chat}</div>;

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 md:right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mb-3 rounded-2xl overflow-hidden shadow-2xl border border-[#2A2D3A] bg-[#0F1117]"
          >
            {chat}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen(o => !o)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00BFFF] to-[#9370DB] flex items-center justify-center shadow-xl"
        >
          <AnimatePresence mode="wait">
            {open
              ? <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                  <ChevronDown className="w-5 h-5 text-white" />
                </motion.div>
              : <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                  <MessageCircle className="w-5 h-5 text-white" />
                </motion.div>
            }
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}