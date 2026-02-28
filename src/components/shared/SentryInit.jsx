import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

let initialized = false;

export function initSentry() {
  if (initialized) return;
  initialized = true;

  const dsn = import.meta.env.VITE_SENTRY_DSN;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || "production",
    tracesSampleRate: 0.1,
    integrations: [
      new Sentry.Replay({ maskAllText: true, blockAllMedia: true }),
    ],
  });

  // Capture unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    Sentry.captureException(event.reason);
    toast.error("An unexpected error occurred. Our team has been notified.");
  });

  // Set user context on init
  base44.auth.me().then((user) => {
    if (user) {
      const subscription = base44.entities.UserSubscription.filter({ user_email: user.email }).catch(() => []);
      const tier = subscription?.[0]?.plan || "free";
      Sentry.setUser({
        id: user.email,
        email: user.email,
        username: user.full_name,
        tier,
      });
    }
  }).catch(() => {});
}

export function SentryErrorBoundary({ children }) {
  useEffect(() => {
    initSentry();
  }, []);

  const handleError = ({ error, resetError }) => {
    Sentry.captureException(error);
    toast.error("Something went wrong. Our team has been notified.");
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1117] text-[#E8E8ED] p-8">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold mb-3 text-[#00BFFF]">Something went wrong</h2>
          <p className="text-[#8B8D97] text-sm mb-2">{error?.message || "An unexpected error occurred."}</p>
          <p className="text-[#8B8D97] text-xs mb-6">This error has been reported automatically.</p>
          <button
            onClick={resetError}
            className="px-6 py-2 rounded-xl bg-[#00BFFF] text-[#0F1117] font-bold text-sm hover:brightness-110 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  };

  return (
    <Sentry.ErrorBoundary fallback={handleError}>
      {children}
    </Sentry.ErrorBoundary>
  );
}

export { Sentry };