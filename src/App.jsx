import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import SignIn from '@/pages/SignIn';
import { useEffect, useRef } from 'react';

// ── Native / PWA platform sync (Capacitor hidden in-app browser framework) ───
// Safe to import on web — all native calls are no-ops when not in Capacitor.
import { usePlatformSync } from '@/hooks/usePlatformSync.js';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// ── PlatformSyncBridge ────────────────────────────────────────────────────────
// Mounts inside <Router> so usePlatformSync can call useNavigate().
// Runs silently in the background — no UI rendered by this component.
const PlatformSyncBridge = () => {
  const { isAuthenticated } = useAuth();
  const initRef = useRef(false);

  // usePlatformSync initialises inAppBrowser, backgroundSync, and nativeShare.
  // shareIntent is set when the user shares something to the app from another app.
  const { syncStatus, shareIntent } = usePlatformSync();

  // Log sync status in dev for visibility; safe to remove in production.
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && syncStatus) {
      console.debug('[PlatformSyncBridge] status:', syncStatus);
    }
  }, [syncStatus]);

  // When a native share intent arrives (deep link or share extension), the hook
  // already navigates to /share-target — we just log it here for debugging.
  useEffect(() => {
    if (shareIntent) {
      console.debug('[PlatformSyncBridge] share intent received:', shareIntent);
    }
  }, [shareIntent]);

  return null; // renders nothing
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show branded loading spinner while checking auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0F1117] gap-4">
        <div className="w-10 h-10 border-4 border-[#2A2D3A] border-t-[#00BFFF] rounded-full animate-spin" />
        <p className="text-sm text-[#8B8D97]">Loading Klip4ge…</p>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Show branded SignIn page instead of bare redirect
      return <SignIn />;
    }
  }

  // Render the main app
  return (
    <>
      {/* Silent background platform sync bridge — no UI */}
      <PlatformSyncBridge />

      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
