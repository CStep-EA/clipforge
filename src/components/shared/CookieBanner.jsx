import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Cookie, X } from "lucide-react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cf-cookie-consent");
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cf-cookie-consent", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("cf-cookie-consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-lg bg-[#1A1D27]/98 backdrop-blur-xl border border-[#2A2D3A] rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Cookie className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-xs text-[#8B8D97] flex-1 leading-relaxed">
          We use essential cookies for authentication and preferences. We do{" "}
          <strong className="text-[#E8E8ED]">not</strong> track you for ads.{" "}
          <Link to={createPageUrl("Cookies")} className="text-[#00BFFF] hover:underline">
            Cookie Policy
          </Link>{" "}
          ·{" "}
          <Link to={createPageUrl("Privacy")} className="text-[#00BFFF] hover:underline">
            Privacy Policy
          </Link>
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={decline}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#2A2D3A] text-[#8B8D97] hover:text-[#E8E8ED] transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF] hover:bg-[#00BFFF]/25 font-semibold transition-colors"
          >
            Accept
          </button>
        </div>
        <button onClick={decline} className="absolute top-3 right-3 sm:hidden text-[#8B8D97] hover:text-[#E8E8ED]">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}