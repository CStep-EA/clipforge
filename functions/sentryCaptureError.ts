/**
 * Lightweight Sentry error reporter for Deno backend functions.
 * Call: await sentryCaptureError(error, { tags: { function: 'myFunc' } })
 */

const SENTRY_DSN = "https://f66f91cc6ce5c0e70b61f87c4a803d86@o4510964671905792.ingest.us.sentry.io/4510964678459392";

// Parse DSN into components
function parseDsn(dsn) {
  const url = new URL(dsn);
  const key = url.username;
  const projectId = url.pathname.replace("/", "");
  const host = url.hostname;
  return { key, projectId, host };
}

export async function sentryCaptureError(error, context = {}) {
  try {
    const { key, projectId, host } = parseDsn(SENTRY_DSN);
    const envelope = [
      JSON.stringify({ sent_at: new Date().toISOString(), dsn: SENTRY_DSN }),
      JSON.stringify({ type: "event" }),
      JSON.stringify({
        event_id: crypto.randomUUID().replace(/-/g, ""),
        timestamp: new Date().toISOString(),
        platform: "javascript",
        level: "error",
        environment: "production",
        logger: "backend",
        exception: {
          values: [{
            type: error?.name || "Error",
            value: error?.message || String(error),
            stacktrace: error?.stack ? {
              frames: error.stack.split("\n").slice(1).map(line => ({ filename: line.trim() }))
            } : undefined,
          }],
        },
        tags: context.tags || {},
        extra: context.extra || {},
      }),
    ].join("\n");

    await fetch(`https://${host}/api/${projectId}/envelope/?sentry_key=${key}&sentry_version=7`, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body: envelope,
    });
  } catch (e) {
    console.error("Sentry capture failed:", e.message);
  }
}

// Serve as a callable function too (for potential internal calls)
Deno.serve(async (req) => {
  return Response.json({ ok: true });
});