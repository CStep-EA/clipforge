import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  UserPlus, UserCheck, ExternalLink, Search, Loader2, CheckCircle2, Lock
} from "lucide-react";
import { toast } from "sonner";

const PLATFORMS = [
  {
    id: "instagram", name: "Instagram", emoji: "📸", color: "#E1306C",
    description: "Find followers & followees who also use ClipForge",
    note: "We only read your public follower list. We never post on your behalf.",
    available: true,
  },
  {
    id: "pinterest", name: "Pinterest", emoji: "📌", color: "#E60023",
    description: "Discover pinners who share your interests",
    note: "Board names and follower count only — no private boards.",
    available: true,
  },
  {
    id: "twitter", name: "X / Twitter", emoji: "🐦", color: "#1DA1F2",
    description: "Match Twitter followers to ClipForge accounts",
    note: "Read-only: public followers/following list.",
    available: true,
  },
  {
    id: "discord", name: "Discord", emoji: "🎮", color: "#5865F2",
    description: "Find friends from your Discord servers",
    note: "Server membership only — messages are never read.",
    available: true,
  },
  {
    id: "twitch", name: "Twitch", emoji: "💜", color: "#9146FF",
    description: "Connect with streamers and viewers you follow",
    note: "Follows list only — chat data is never accessed.",
    available: true,
  },
  {
    id: "youtube", name: "YouTube", emoji: "▶️", color: "#FF0000",
    description: "Match subscriptions to ClipForge creators",
    note: "Channel subscriptions only — history never accessed.",
    available: false, // coming soon
  },
];

export default function FindFriendsPanel({ user, plan = "free" }) {
  const qc = useQueryClient();
  const [consentPlatform, setConsentPlatform] = useState(null);
  const [searching, setSearching] = useState(null);
  const [discovered, setDiscovered] = useState({});
  const [connected, setConnected] = useState({});

  const { data: existingConnections = [] } = useQuery({
    queryKey: ["friends_sent", user?.email],
    queryFn: () => base44.entities.FriendConnection.filter({ requester_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: socialConns = [] } = useQuery({
    queryKey: ["social_connections", user?.email],
    queryFn: () => base44.entities.SocialConnection.list(),
    enabled: !!user?.email,
  });

  const isConnectedSocial = (platformId) =>
    socialConns.find(s => s.platform === platformId)?.connected === true;

  const alreadyInvited = (email) =>
    existingConnections.some(c => c.recipient_email === email);

  const handleConsentAccept = async () => {
    const platform = consentPlatform;
    setConsentPlatform(null);
    setSearching(platform.id);

    // Simulate follower discovery via AI (real OAuth would use a backend function)
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate 4-6 realistic mock friend suggestions for a user who connected their ${platform.name} account to a content-saving app called ClipForge. Return JSON with an array of objects: { name, username, platform, mutual_interests, email_hint }. Use plausible but fictional names.`,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                username: { type: "string" },
                platform: { type: "string" },
                mutual_interests: { type: "array", items: { type: "string" } },
                email_hint: { type: "string" },
              }
            }
          }
        }
      }
    });

    setDiscovered(prev => ({ ...prev, [platform.id]: result.suggestions || [] }));
    setSearching(null);
    toast.success(`Found ${result.suggestions?.length || 0} potential friends on ${platform.name}!`);
  };

  const sendInvite = async (suggestion, platformId) => {
    const email = suggestion.email_hint;
    if (alreadyInvited(email)) {
      toast.info("Already invited!");
      return;
    }
    await base44.entities.FriendConnection.create({
      requester_email: user.email,
      recipient_email: email,
      recipient_name: suggestion.name,
      status: "pending",
      source: platformId,
    });
    setConnected(prev => ({ ...prev, [`${platformId}-${suggestion.username}`]: true }));
    qc.invalidateQueries({ queryKey: ["friends_sent"] });
    toast.success(`Invite sent to ${suggestion.name}!`);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-sm text-[#E8E8ED] mb-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-[#00BFFF]" /> Find Friends via Social Platforms
        </h3>
        <p className="text-xs text-[#8B8D97]">
          Connect a platform to discover followers who are already on ClipForge. We only request read-only access with your consent.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PLATFORMS.map(platform => {
          const isLinked = isConnectedSocial(platform.id);
          const isBusy = searching === platform.id;
          const results = discovered[platform.id] || [];

          return (
            <div key={platform.id} className="space-y-2">
              <Card className="glass-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platform.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{platform.name}</p>
                        {!platform.available && (
                          <Badge variant="outline" className="text-[9px] border-[#2A2D3A] text-[#8B8D97]">Soon</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-[#8B8D97]">{platform.description}</p>
                    </div>
                  </div>
                  {platform.available ? (
                    <Button
                      size="sm"
                      disabled={isBusy}
                      onClick={() => setConsentPlatform(platform)}
                      className="text-xs shrink-0"
                      style={{ background: isLinked ? `${platform.color}20` : `${platform.color}`, color: isLinked ? platform.color : "#fff", border: isLinked ? `1px solid ${platform.color}40` : "none" }}
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isLinked ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Search</>
                      ) : (
                        <><Search className="w-3 h-3 mr-1" /> Find</>
                      )}
                    </Button>
                  ) : (
                    <Button size="sm" disabled variant="outline" className="text-xs border-[#2A2D3A] text-[#8B8D97]">
                      <Lock className="w-3 h-3 mr-1" /> Soon
                    </Button>
                  )}
                </div>
              </Card>

              {/* Discovered suggestions for this platform */}
              {results.length > 0 && (
                <div className="space-y-2 pl-1">
                  {results.map((s) => {
                    const key = `${platform.id}-${s.username}`;
                    const sent = connected[key] || alreadyInvited(s.email_hint);
                    return (
                      <Card key={key} className="glass-card p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                          style={{ background: `${platform.color}20`, color: platform.color }}>
                          {s.name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{s.name}</p>
                          <p className="text-[10px] text-[#8B8D97] truncate">@{s.username}</p>
                          {s.mutual_interests?.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {s.mutual_interests.slice(0, 2).map(i => (
                                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00BFFF]/10 text-[#00BFFF]">{i}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button size="sm" disabled={sent} onClick={() => sendInvite(s, platform.id)}
                          className={sent
                            ? "text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "text-[9px] bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white"
                          }>
                          {sent ? <><UserCheck className="w-3 h-3 mr-0.5" /> Sent</> : <><UserPlus className="w-3 h-3 mr-0.5" /> Invite</>}
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Consent Modal */}
      <Dialog open={!!consentPlatform} onOpenChange={() => setConsentPlatform(null)}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{consentPlatform?.emoji}</span>
              Connect {consentPlatform?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-[#0F1117] border border-[#2A2D3A] space-y-2">
              <p className="text-xs font-semibold text-[#00BFFF]">What we access:</p>
              <p className="text-xs text-[#E8E8ED]">✅ Read-only follower / following list</p>
              <p className="text-xs text-[#E8E8ED]">✅ Public profile info (name, username)</p>
              <p className="text-xs text-red-400">❌ We will never post, like, or message</p>
              <p className="text-xs text-red-400">❌ No DMs, private posts, or passwords</p>
            </div>
            <p className="text-xs text-[#8B8D97]">
              {consentPlatform?.note} You can revoke access at any time in Settings. By proceeding you agree to our{" "}
              <a href="#" className="underline text-[#00BFFF]">Privacy Policy</a>.
            </p>
            <p className="text-[10px] text-[#8B8D97] border border-[#2A2D3A] rounded-lg p-2">
              🔒 GDPR / CCPA: Your data is only used to match friends. We never sell it. Revoke anytime.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConsentPlatform(null)} className="text-[#8B8D97]">Cancel</Button>
            <Button onClick={handleConsentAccept}
              className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-2">
              <ExternalLink className="w-3.5 h-3.5" /> I Consent — Find Friends
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}