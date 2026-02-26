import { useState, useEffect } from "react";
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
          --primary: 195 100% 50%;       /* #00BFFF neon blue */
          --primary-foreground: 220 15% 8%;
          --secondary: 263 47% 58%;      /* #9370DB purple */
          --secondary-foreground: 0 0% 100%;
          --destructive-foreground: 0 0% 98%;
          --ring: 195 100% 50%;
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

      {/* Mobile top header with logo */}
      <div className="md:hidden flex items-center px-4 pt-4 pb-2">
        <ClipForgeLogo size={32} showText variant="default" />
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