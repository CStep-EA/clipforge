import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Loader2, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

const SYSTEM_CONTEXT = `You are ClipForge's internal AI assistant for admin users. You help admins understand app metrics, draft support responses, suggest product improvements, and answer questions about the platform. ClipForge is a social media content saving & AI organization app with features: social connects (Instagram, Facebook, Pinterest, Twitter, TikTok), AI summaries, shared boards, shopping lists, events, freemium plans (free/pro/premium). Be concise, helpful, and professional.`;

export default function AdminChatbot() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your ClipForge admin assistant. Ask me anything — user trends, feature ideas, support templates, or product strategy. 🚀" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    const history = messages.map(m => `${m.role === "user" ? "Admin" : "Assistant"}: ${m.content}`).join("\n");
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM_CONTEXT}\n\nConversation history:\n${history}\n\nAdmin: ${userMsg}\n\nAssistant:`,
    });

    setMessages(prev => [...prev, { role: "assistant", content: result }]);
    setLoading(false);
  };

  const QUICK = ["What features should I add next?", "Draft an email announcing Pro plan", "How should I price the premium tier?", "What metrics matter most for a SaaS?"];

  return (
    <Card className="glass-card flex flex-col h-[600px]">
      <div className="flex items-center gap-2 p-4 border-b border-[#2A2D3A]">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#9370DB] to-[#00BFFF] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold">ClipForge Admin AI</p>
          <p className="text-[10px] text-[#8B8D97]">Your internal product & support assistant</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#9370DB] to-[#00BFFF] flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === "user"
              ? "bg-[#00BFFF]/15 text-[#E8E8ED] border border-[#00BFFF]/20"
              : "bg-[#1A1D27] text-[#E8E8ED] border border-[#2A2D3A]"}`}
            >
              {msg.role === "assistant" ? (
                <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-[#2A2D3A] flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-[#8B8D97]" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#9370DB] to-[#00BFFF] flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-[#9370DB]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {QUICK.map(q => (
            <button key={q} onClick={() => { setInput(q); }}
              className="text-[10px] px-3 py-1.5 rounded-full border border-[#2A2D3A] text-[#8B8D97] hover:border-[#9370DB]/40 hover:text-[#9370DB] transition-colors">
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 border-t border-[#2A2D3A] flex gap-2">
        <Input
          placeholder="Ask anything about ClipForge..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
        />
        <Button onClick={send} disabled={!input.trim() || loading} className="bg-[#9370DB] text-white shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}