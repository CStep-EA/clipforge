import { useEffect } from "react";
import * as Sentry from "@sentry/react";

const SENTRY_DSN = "https://f66f91cc6ce5c0e70b61f87c4a803d86@o4510964671905792.ingest.us.sentry.io/4510964678459392";

let initialized = false;

export function initSentry() {
  if (initialized) return;
  initialized = true;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE || "production",
    tracesSampleRate: 0.1,
    integrations: [],
  });
}

export function SentryErrorBoundary({ children }) {
  useEffect(() => {
    initSentry();
  }, []);

  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
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
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

export { Sentry };