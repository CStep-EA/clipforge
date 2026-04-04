/**
 * getFbAgentStatus.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight Base44 server function that stores + retrieves the agent's
 * heartbeat state so the Klip4ge UI can show live sync status without
 * requiring a direct connection to the user's local machine.
 *
 * The agent POSTs its state every 30s via the updateFbAgentStatus endpoint.
 * This endpoint serves that state back to the UI.
 *
 * GET  /getFbAgentStatus          → returns latest state for authenticated user
 * POST /getFbAgentStatus          → agent heartbeat update (upsert)
 *
 * State shape stored in UserPreference entity:
 * {
 *   status: 'idle' | 'running' | 'success' | 'error' | 'needs_login'
 *   last_run:     ISO string
 *   last_success: ISO string
 *   last_imported: number
 *   total_imported: number
 *   run_count: number
 *   last_error: string | null
 *   agent_version: string
 *   heartbeat: ISO string
 *   pid: number | null
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const STATE_PREF_KEY = "fb_agent_state";
const STALE_MINUTES  = 3; // agent considered offline after 3 min no heartbeat

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user   = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // ── POST: agent heartbeat / state update ─────────────────────────────
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));

      // Validate it's coming from a reasonable source (has pid or status)
      if (!body.status && !body.heartbeat && !body.pid) {
        return Response.json({ error: "Invalid state payload" }, { status: 400 });
      }

      const stateJson = JSON.stringify({ ...body, updated_at: new Date().toISOString() });

      // Upsert into UserPreference (key = fb_agent_state, user-scoped)
      try {
        const existing = await base44.asServiceRole.entities.UserPreference?.filter?.({
          user_email: user.email,
          key: STATE_PREF_KEY,
        });

        if (existing?.length) {
          await base44.asServiceRole.entities.UserPreference.update(existing[0].id, {
            value: stateJson,
          });
        } else {
          await base44.asServiceRole.entities.UserPreference.create({
            user_email: user.email,
            key:   STATE_PREF_KEY,
            value: stateJson,
          });
        }
      } catch {
        // UserPreference entity might not exist — fall back to AppState
        try {
          const k = `${STATE_PREF_KEY}_${user.email}`;
          const ex2 = await base44.asServiceRole.entities.AppState?.filter?.({ key: k });
          if (ex2?.length) {
            await base44.asServiceRole.entities.AppState.update(ex2[0].id, { value: stateJson });
          } else {
            await base44.asServiceRole.entities.AppState.create({ key: k, value: stateJson });
          }
        } catch (e2) {
          console.error("[getFbAgentStatus] State save failed:", (e2 as Error).message);
        }
      }

      return Response.json({ ok: true });
    }

    // ── GET: retrieve latest state for UI ────────────────────────────────
    let stateRaw: string | null = null;

    try {
      const prefs = await base44.asServiceRole.entities.UserPreference?.filter?.({
        user_email: user.email,
        key: STATE_PREF_KEY,
      });
      if (prefs?.length) stateRaw = prefs[0].value;
    } catch {
      try {
        const k   = `${STATE_PREF_KEY}_${user.email}`;
        const st  = await base44.asServiceRole.entities.AppState?.filter?.({ key: k });
        if (st?.length) stateRaw = st[0].value;
      } catch {}
    }

    if (!stateRaw) {
      return Response.json({
        status:  "not_configured",
        message: "Agent not set up yet. Download the Klip4ge FB Sync Agent to get started.",
      });
    }

    const state = JSON.parse(stateRaw);

    // Determine if agent is stale (missed heartbeats)
    const heartbeat  = state.heartbeat || state.updated_at;
    const staleness  = heartbeat
      ? (Date.now() - new Date(heartbeat).getTime()) / 60000
      : Infinity;

    const agentOnline = staleness < STALE_MINUTES && state.pid != null;

    return Response.json({
      ...state,
      agent_online:  agentOnline,
      stale_minutes: Math.round(staleness),
    });

  } catch (e) {
    const msg = (e as Error).message || "Unknown error";
    console.error("[getFbAgentStatus]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
});
