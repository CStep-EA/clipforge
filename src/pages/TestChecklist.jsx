import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, RotateCcw, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

const CHECKLIST_KEY = "cf_test_checklist";

const defaultChecks = [
  { id: "support_ticket", label: "Create support ticket as user", category: "Support" },
  { id: "escalate_ai", label: "Escalate via AI bot", category: "Support" },
  { id: "view_ticket_admin", label: "View ticket in admin panel", category: "Support" },
  { id: "save_event", label: "Save event → add to calendar", category: "Events" },
  { id: "reminder_stub", label: "Check event reminder stub functionality", category: "Events" },
  { id: "referral_link", label: "Generate & share referral link", category: "Referral" },
  { id: "simulate_signup", label: "Simulate friend signup via referral", category: "Referral" },
  { id: "special_account", label: "Create special account in admin", category: "Admin" },
  { id: "pwa_prompt", label: "Trigger PWA install prompt", category: "PWA" },
  { id: "footer_links", label: "Check Privacy/Terms links in footer", category: "Navigation" },
];

export default function TestChecklist() {
  const [user, setUser] = useState(null);
  const [checks, setChecks] = useState(() => {
    const saved = localStorage.getItem(CHECKLIST_KEY);
    return saved ? JSON.parse(saved) : defaultChecks.map(c => ({ ...c, status: null }));
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checks));
  }, [checks]);

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0F1117] text-[#E8E8ED] p-6 flex items-center justify-center">
        <Card className="glass-card border-red-500/30 bg-red-500/5 max-w-md">
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-400 mb-2">Admin Only</h2>
            <p className="text-sm text-[#8B8D97]">This test checklist is only accessible to admin users.</p>
          </div>
        </Card>
      </div>
    );
  }

  const updateCheck = (id, status) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    toast.success(`Marked as ${status === "pass" ? "✅ Pass" : "❌ Fail"}`);
  };

  const resetChecklist = () => {
    if (confirm("Reset all checks? This cannot be undone.")) {
      setChecks(defaultChecks.map(c => ({ ...c, status: null })));
      toast.success("Checklist reset");
    }
  };

  const passCount = checks.filter(c => c.status === "pass").length;
  const failCount = checks.filter(c => c.status === "fail").length;
  const totalCount = checks.length;
  const progress = Math.round((passCount / totalCount) * 100);

  const categories = [...new Set(checks.map(c => c.category))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1117] to-[#1A1D27] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#E8E8ED] mb-2">Alpha Test Checklist</h1>
          <p className="text-[#8B8D97]">Manual testing workflow for ClipForge features</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="glass-card border-[#00BFFF]/30">
            <div className="p-4">
              <div className="text-sm text-[#8B8D97] mb-1">Progress</div>
              <div className="text-3xl font-bold text-[#00BFFF]">{progress}%</div>
              <div className="text-xs text-[#8B8D97] mt-2">{passCount} of {totalCount} passed</div>
            </div>
          </Card>
          <Card className="glass-card border-emerald-500/30">
            <div className="p-4">
              <div className="text-sm text-[#8B8D97] mb-1">Passed</div>
              <div className="text-3xl font-bold text-emerald-400">{passCount}</div>
            </div>
          </Card>
          <Card className="glass-card border-red-500/30">
            <div className="p-4">
              <div className="text-sm text-[#8B8D97] mb-1">Failed</div>
              <div className="text-3xl font-bold text-red-400">{failCount}</div>
            </div>
          </Card>
        </div>

        {/* Checklist by category */}
        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-bold text-[#E8E8ED] mb-4 flex items-center gap-2">
              <div className="w-1 h-6 rounded bg-[#00BFFF]" />
              {category}
            </h2>
            <div className="space-y-3">
              {checks.filter(c => c.category === category).map(check => (
                <Card key={check.id} className="glass-card border-[#2A2D3A]">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[#E8E8ED]">{check.label}</h3>
                      <p className="text-xs text-[#8B8D97] mt-1">{check.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {check.status && (
                        <div className="flex items-center gap-2">
                          {check.status === "pass" ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant={check.status === "pass" ? "default" : "outline"}
                        onClick={() => updateCheck(check.id, "pass")}
                        className="w-16 text-xs"
                      >
                        ✓ Pass
                      </Button>
                      <Button
                        size="sm"
                        variant={check.status === "fail" ? "destructive" : "outline"}
                        onClick={() => updateCheck(check.id, "fail")}
                        className="w-16 text-xs"
                      >
                        ✗ Fail
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {/* Action buttons */}
        <div className="mt-12 flex gap-3 flex-wrap">
          <Button
            onClick={resetChecklist}
            variant="outline"
            className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Checklist
          </Button>
          <Button
            asChild
            variant="outline"
            className="gap-2"
          >
            <a href={createPageUrl("Support")} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              Go to Support
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="gap-2"
          >
            <a href={createPageUrl("Saves")} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              Go to Saves
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="gap-2"
          >
            <a href={createPageUrl("Pricing")} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              Go to Pricing (Referral)
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="gap-2"
          >
            <a href={createPageUrl("Admin")} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              Go to Admin
            </a>
          </Button>
        </div>

        {/* Tips */}
        <Card className="glass-card border-[#00BFFF]/20 mt-12 bg-[#00BFFF]/5">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-[#00BFFF] mb-2">💡 Quick Tips</h3>
            <ul className="text-xs text-[#8B8D97] space-y-1">
              <li>• <strong>Support ticket:</strong> Go to Support page, fill form, submit</li>
              <li>• <strong>Escalate AI:</strong> Chat with support bot, it should suggest escalation</li>
              <li>• <strong>View ticket admin:</strong> Check Admin panel → Support Tickets</li>
              <li>• <strong>Save event:</strong> Navigate to Events, create/save an event</li>
              <li>• <strong>Reminder stub:</strong> Check EventReminders automation in functions</li>
              <li>• <strong>Referral link:</strong> Go to Pricing, share your referral code</li>
              <li>• <strong>Simulate signup:</strong> Have another user use your referral code</li>
              <li>• <strong>Special account:</strong> Admin → Create Special Account dialog</li>
              <li>• <strong>PWA prompt:</strong> Check GetAppButton component (may not trigger in iframe)</li>
              <li>• <strong>Footer links:</strong> Scroll to footer, verify Privacy/Terms load</li>
            </ul>
          </div>
        </Card>

        {/* Debug info */}
        <Card className="glass-card border-[#2A2D3A] mt-6 bg-[#1A1D27]">
          <div className="p-4">
            <p className="text-xs text-[#8B8D97]">
              <code className="text-amber-300">Checklist data stored in localStorage ({CHECKLIST_KEY})</code>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}