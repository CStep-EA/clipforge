import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, Loader2, HandHelpingIcon, Ticket, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const SYSTEM_PROMPT = `You are the ClipForge AI Support Assistant. You help users with:
- How to use ClipForge features (saves, boards, friends, integrations, subscriptions)
- Troubleshooting common issues
- Explaining pricing and plans (Free, Pro $7.99/mo, Premium $14.99/mo, Family $19.99/mo)
- Summarizing the privacy policy and terms

If a user describes a bug or a problem that needs human attention, suggest creating a support ticket.
Keep answers brief (2-4 sentences). Be friendly and helpful. If unsure, say so honestly.
Start responses with a relevant emoji.`;

export default function SupportBot({ user, floating = false }) {
  const [open, setOpen] = useState(!floating);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "👋 Hi! I'm the ClipForge support bot. Ask me anything about the app, or describe an issue and I'll help you out!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketDraft, setTicketDraft] = useState(null);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const detectTicketIntent = (text) => {
    const triggers = ["create ticket", "report bug", "not working", "broken", "error", "issue", "problem", "crash", "can't", "cannot", "doesn't work", "escalate", "human"];
    return triggers.some(t => text.toLowerCase().includes(t));
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.map(m => `${m.role === "user" ? "User" : "Bot"}: ${m.content}`).join("\n");
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${SYSTEM_PROMPT}\n\nConversation so far:\n${history}\n\nUser: ${userMsg}\n\nAssistant:`,
      });

      setMessages(prev => [...prev, { role: "assistant", content: response }]);

      // Suggest ticket if issue detected
      if (detectTicketIntent(userMsg) && !ticketDraft) {
        setTicketDraft({ subject: userMsg.slice(0, 80), message: userMsg, category: "bug", priority: "medium" });
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ I had trouble connecting. Please try again or create a support ticket." }]);
    }
    setLoading(false);
  };

  const handleCreateTicket = async () => {
    if (!ticketDraft) return;
    setCreatingTicket(true);
    await base44.entities.SupportTicket.create({
      ...ticketDraft,
      message: `[Via AI Bot]\n\n${ticketDraft.message}`,
    });
    queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
    setTicketDraft(null);
    setCreatingTicket(false);
    setMessages(prev => [...prev, { role: "assistant", content: "✅ Ticket created! Our team will review it soon. You can track it in the Support page." }]);
    toast.success("Support ticket created");
  };

  const chat = (
    <div className={`flex flex-col ${floating ? "h-[420px] w-[340px]" : "h-full min-h-[400px]"}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#2A2D3A] bg-gradient-to-r from-[#00BFFF]/10 to-[#9370DB]/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#9370DB]" />
          <span className="text-sm font-semibold">AI Support</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        {floating && (
          <button onClick={() => setOpen(false)} className="text-[#8B8D97] hover:text-[#E8E8ED]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
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
            <div className="bg-[#1A1D27] border border-[#2A2D3A] px-3 py-2 rounded-2xl">
              <Loader2 className="w-3 h-3 text-[#9370DB] animate-spin" />
            </div>
          </div>
        )}

        {/* Ticket draft suggestion */}
        {ticketDraft && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20 space-y-2">
            <p className="text-[10px] text-[#F59E0B] font-medium flex items-center gap-1">
              <Ticket className="w-3 h-3" /> Create a support ticket?
            </p>
            <p className="text-[10px] text-[#8B8D97]">It sounds like you're having an issue. Would you like me to create a ticket so our team can help?</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateTicket} disabled={creatingTicket}
                className="h-6 text-[10px] bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 hover:bg-[#F59E0B]/30 px-2">
                {creatingTicket ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create Ticket"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setTicketDraft(null)}
                className="h-6 text-[10px] text-[#8B8D97] px-2">Dismiss</Button>
            </div>
          </motion.div>
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
        <Button size="sm" onClick={sendMessage} disabled={!input.trim() || loading}
          className="h-8 px-2 bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white">
          <Send className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );

  if (!floating) return <div className="glass-card rounded-2xl overflow-hidden">{chat}</div>;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="mb-3 glass-card rounded-2xl overflow-hidden shadow-2xl border border-[#2A2D3A]"
          >
            {chat}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex justify-end">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00BFFF] to-[#9370DB] flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        >
          {open ? <ChevronDown className="w-5 h-5 text-white" /> : <MessageCircle className="w-5 h-5 text-white" />}
        </button>
      </div>
    </div>
  );
}