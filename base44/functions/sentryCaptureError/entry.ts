/**
 * Sentry error capture utility — callable as a backend function.
 * POST { errorName, errorMessage, errorStack, tags, extra }
 */

const SENTRY_DSN = "https://f66f91cc6ce5c0e70b61f87c4a803d86@o4510964671905792.ingest.us.sentry.io/4510964678459392";

async function captureToSentry({ errorName, errorMessage, errorStack, tags = {}, extra = {} }) {
  try {
    const url = new URL(SENTRY_DSN);
    const key = url.username;
    const projectId = url.pathname.replace("/", "");
    const host = url.hostname;

    const envelope = [
      JSON.stringify({ sent_at: new Date().toISOString() }),
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
            type: errorName || "Error",
            value: errorMessage || "Unknown error",
            stacktrace: errorStack ? {
              frames: errorStack.split("\n").slice(1, 8).map(line => ({ filename: line.trim() }))
            } : undefined,
          }],
        },
        tags,
        extra,
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

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    await captureToSentry(body);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false });
  }
});