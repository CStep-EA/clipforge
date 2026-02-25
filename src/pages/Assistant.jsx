import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Plus, Loader2 } from "lucide-react";
import MessageBubble from "@/components/chat/MessageBubble";

export default function Assistant() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    const convs = await base44.agents.listConversations({ agent_name: "clipforge_assistant" });
    setConversations(convs || []);
  };

  const createConv = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: "clipforge_assistant",
      metadata: { name: "New Chat" },
    });
    setConversations(prev => [conv, ...prev]);
    setActiveConv(conv);
    setMessages([]);
  };

  const loadConv = async (conv) => {
    const full = await base44.agents.getConversation(conv.id);
    setActiveConv(full);
    setMessages(full.messages || []);
  };

  useEffect(() => {
    if (!activeConv?.id) return;
    const unsub = base44.agents.subscribeToConversation(activeConv.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsub();
  }, [activeConv?.id]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    if (!activeConv) {
      await createConv();
    }

    setSending(true);
    const conv = activeConv || (await base44.agents.listConversations({ agent_name: "clipforge_assistant" }))?.[0];
    if (conv) {
      await base44.agents.addMessage(conv, { role: "user", content: input });
    }
    setInput("");
    setSending(false);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-[#2A2D3A] bg-[#0F1117]">
        <div className="p-4 border-b border-[#2A2D3A]">
          <Button onClick={createConv} className="w-full bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-2">
            <Plus className="w-4 h-4" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => loadConv(conv)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all truncate
                ${activeConv?.id === conv.id ? "bg-[#00BFFF]/10 text-[#00BFFF]" : "text-[#8B8D97] hover:bg-[#1A1D27]"}`}
            >
              {conv.metadata?.name || "Chat"}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-[#0F1117]">
        {/* Header */}
        <div className="p-4 border-b border-[#2A2D3A] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00BFFF] to-[#9370DB] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">ClipForge AI</h2>
            <p className="text-[10px] text-[#8B8D97]">Your smart vault assistant</p>
          </div>
          <Button onClick={createConv} className="md:hidden ml-auto" size="sm" variant="outline">
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center pt-20">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00BFFF]/20 to-[#9370DB]/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-[#00BFFF]" />
                </div>
                <h3 className="font-semibold mb-2">Ask me anything</h3>
                <p className="text-xs text-[#8B8D97] max-w-sm">
                  I can help organize your saves, research topics, create shopping lists, find deals, and more.
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {["Find my best deals", "Create a gift list", "Summarize my recipes"].map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="px-3 py-1.5 rounded-full text-xs bg-[#1A1D27] border border-[#2A2D3A] text-[#8B8D97] hover:text-[#00BFFF] hover:border-[#00BFFF]/30 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#2A2D3A]">
          <div className="flex gap-3 max-w-3xl mx-auto">
            <Input
              placeholder="Ask ClipForge AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] placeholder:text-[#8B8D97]/50 rounded-xl"
            />
            <Button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white rounded-xl"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}