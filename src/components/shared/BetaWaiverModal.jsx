import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BetaWaiverModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cf-beta-waiver");
    if (!accepted) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cf-beta-waiver", "accepted-" + new Date().toISOString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1A1D27] border border-[#F59E0B]/40 rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div>
            <h2 className="font-bold text-[#E8E8ED]">Alpha / Beta Software</h2>
            <p className="text-xs text-[#8B8D97]">Tester Agreement — please read before continuing</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-[#8B8D97] leading-relaxed">
          <p>ClipForge is <strong className="text-[#F59E0B]">pre-release software</strong>. By continuing you agree:</p>
          <ul className="space-y-1.5 pl-4">
            {[
              "This software is provided \"as-is\" with no warranty of any kind.",
              "Features may change or be removed without notice.",
              "Data loss is possible — do not rely solely on ClipForge for important content.",
              "You will not hold ClipForge or its team liable for any loss or damage.",
              "Uptime and reliability are not guaranteed during beta.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#F59E0B] mt-0.5 flex-shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs">
            Full details in our{" "}
            <Link to={createPageUrl("Terms")} className="text-[#00BFFF] hover:underline" onClick={accept}>
              Terms of Service
            </Link>.
          </p>
        </div>

        <Button
          onClick={accept}
          className="w-full bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-black font-bold gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          I Understand — Continue to ClipForge
        </Button>
      </div>
    </div>
  );
}