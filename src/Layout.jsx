import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import ClipForgeLogo from "@/components/shared/ClipForgeLogo";
import { base44 } from "@/api/base44Client";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0F1117] text-[#E8E8ED]">
      <style>{`
        :root {
          --background: 222 15% 7%;
          --foreground: 240 6% 93%;
          --card: 225 14% 12%;
          --card-foreground: 240 6% 93%;
          --popover: 225 14% 12%;
          --popover-foreground: 240 6% 93%;
          --primary: 195 100% 50%;
          --primary-foreground: 0 0% 100%;
          --secondary: 259 52% 65%;
          --secondary-foreground: 0 0% 100%;
          --muted: 225 14% 18%;
          --muted-foreground: 240 4% 57%;
          --accent: 225 14% 18%;
          --accent-foreground: 240 6% 93%;
          --border: 225 14% 18%;
          --input: 225 14% 18%;
          --ring: 195 100% 50%;
        }
        /* PWA safe area */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        }
      `}</style>

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar currentPage={currentPageName} userRole={user?.role} />
      </div>

      {/* Main content */}
      <main className="md:ml-[240px] pb-20 md:pb-0 pb-safe min-h-screen">
        {children}
      </main>

      {/* Mobile nav */}
      <MobileNav currentPage={currentPageName} />
    </div>
  );
}