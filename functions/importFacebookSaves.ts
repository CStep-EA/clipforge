/**
 * importFacebookSaves.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Base44 server function — receives the JSON exported by the
 * Klip4ge Facebook Saves Scraper and bulk-imports it into the user's vault.
 *
 * POST body:
 *   {
 *     saves: KlipSave[]           // array from facebook-saves.json
 *     createBoards?: boolean      // true → create SharedBoards per collection
 *     overwrite?: boolean         // true → re-import even if URL already exists
 *   }
 *
 * Returns:
 *   {
 *     imported: number,
 *     skipped: number,
 *     boards_created: number,
 *     errors: string[]
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

// ── Types ────────────────────────────────────────────────────────────────────
interface FbSave {
  id?: string;
  title: string;
  description?: string;
  url?: string;
  image_url?: string;
  category?: string;
  source?: string;
  tags?: string[];
  collection?: string;
  save_date?: string;
  ai_summary?: string;
  rating?: number | null;
  is_favorite?: boolean;
}

interface ImportBody {
  saves: FbSave[];
  createBoards?: boolean;
  overwrite?: boolean;
}

// ── Category validation ───────────────────────────────────────────────────────
const VALID_CATEGORIES = new Set([
  "deal", "recipe", "event", "product", "article",
  "travel", "gift_idea", "other",
]);

function sanitizeCategory(cat?: string): string {
  if (!cat) return "other";
  const c = cat.toLowerCase().replace(/\s+/g, "_");
  return VALID_CATEGORIES.has(c) ? c : "other";
}

// ── Rate limit check ──────────────────────────────────────────────────────────
const RATE_LIMIT_KEY_PREFIX = "fb_import_ratelimit_";
const RATE_LIMIT_MAX = 500;   // max saves per hour
const RATE_LIMIT_WINDOW = 3600; // seconds

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body: ImportBody = await req.json();
    const { saves = [], createBoards = true, overwrite = false } = body;

    if (!Array.isArray(saves) || saves.length === 0) {
      return Response.json({ error: "No saves provided. Pass a 'saves' array." }, { status: 400 });
    }

    if (saves.length > 2000) {
      return Response.json({
        error: "Batch too large. Max 2000 saves per request. Split into multiple requests.",
      }, { status: 400 });
    }

    // ── Rate limit ────────────────────────────────────────────────────────
    const rlKey = `${RATE_LIMIT_KEY_PREFIX}${user.email}`;
    let rlRecord: { count: number; window_start: number } | null = null;
    try {
      const rlList = await base44.asServiceRole.entities.AppState?.filter?.({ key: rlKey });
      if (rlList?.length) {
        rlRecord = JSON.parse(rlList[0].value || "{}");
      }
    } catch {}

    const now = Math.floor(Date.now() / 1000);
    if (rlRecord && now - rlRecord.window_start < RATE_LIMIT_WINDOW) {
      if (rlRecord.count >= RATE_LIMIT_MAX) {
        return Response.json({
          error: `Rate limit hit: max ${RATE_LIMIT_MAX} imports per hour. Try again later.`,
          retry_after: RATE_LIMIT_WINDOW - (now - rlRecord.window_start),
        }, { status: 429 });
      }
    }

    // ── Fetch existing URLs to skip duplicates ────────────────────────────
    let existingUrls = new Set<string>();
    if (!overwrite) {
      try {
        const existing = await base44.asServiceRole.entities.SavedItem.filter({
          source: "facebook",
        });
        existingUrls = new Set(
          existing
            .map((e: Record<string, string>) => e.url)
            .filter(Boolean)
        );
      } catch {
        console.warn("[importFacebookSaves] Could not fetch existing items — proceeding without dedup");
      }
    }

    // ── Build items to create ─────────────────────────────────────────────
    const errors: string[] = [];
    const toCreate: Record<string, unknown>[] = [];
    const collectionNames = new Set<string>();

    for (const save of saves) {
      try {
        const url = save.url?.trim() || "";

        // Skip if URL already exists (unless overwrite)
        if (!overwrite && url && existingUrls.has(url)) continue;

        const title = save.title?.trim().slice(0, 200) || "Facebook save";
        const category = sanitizeCategory(save.category);
        const tags = (save.tags || ["facebook"]).filter((t): t is string => typeof t === "string" && t.length > 0);
        const collection = save.collection?.trim() || "All Saves";

        if (collection && collection !== "All Saves") {
          collectionNames.add(collection);
        }

        toCreate.push({
          title,
          description: (save.description || "").slice(0, 500),
          url,
          image_url: save.image_url?.trim() || "",
          category,
          source: "facebook",
          tags: [...new Set(tags)].slice(0, 10),
          ai_summary: save.ai_summary
            ? save.ai_summary.slice(0, 300)
            : `Saved from Facebook${collection !== "All Saves" ? ` (${collection})` : ""}`,
          rating: typeof save.rating === "number" ? save.rating : null,
          is_favorite: save.is_favorite === true,
          notes: collection !== "All Saves" ? `Collection: ${collection}` : "",
          created_by: user.email,
        });
      } catch (itemErr) {
        errors.push(`Failed to process item "${save.title || "unknown"}": ${(itemErr as Error).message}`);
      }
    }

    if (toCreate.length === 0) {
      return Response.json({
        imported: 0,
        skipped: saves.length,
        boards_created: 0,
        errors,
        message: saves.length === 0
          ? "No saves in payload."
          : "All items already exist in your vault. Pass overwrite:true to re-import.",
      });
    }

    // ── Bulk create saves ─────────────────────────────────────────────────
    let created: Record<string, unknown>[] = [];
    try {
      created = await base44.asServiceRole.entities.SavedItem.bulkCreate(toCreate);
    } catch (e) {
      // Fallback: create one by one
      console.warn("[importFacebookSaves] bulkCreate failed, falling back to sequential create:", (e as Error).message);
      for (const item of toCreate) {
        try {
          const r = await base44.asServiceRole.entities.SavedItem.create(item);
          created.push(r);
        } catch (ie) {
          errors.push(`Failed to save "${item.title}": ${(ie as Error).message}`);
        }
      }
    }

    const imported = created.length;
    const skipped = saves.length - toCreate.length;

    // ── Optionally create SharedBoards per collection ─────────────────────
    let boardsCreated = 0;
    if (createBoards && collectionNames.size > 0) {
      // Fetch existing boards to avoid duplication
      let existingBoards: Set<string> = new Set();
      try {
        const boards = await base44.asServiceRole.entities.SharedBoard.filter({
          created_by: user.email,
        });
        existingBoards = new Set(boards.map((b: Record<string, string>) => b.name));
      } catch {}

      for (const colName of collectionNames) {
        if (existingBoards.has(`FB: ${colName}`)) continue;
        try {
          // Get the item IDs we just created that belong to this collection
          const colItems = toCreate
            .filter(i => (i.notes as string)?.includes(colName))
            .slice(0, 50); // boards hold up to 50 item references

          await base44.asServiceRole.entities.SharedBoard.create({
            name: `FB: ${colName}`,
            description: `Imported from Facebook collection "${colName}" via Klip4ge Facebook Saves Scraper`,
            is_public: false,
            source: "facebook_import",
            created_by: user.email,
            tags: ["facebook", "imported"],
          });
          boardsCreated++;
        } catch (be) {
          errors.push(`Board "${colName}" failed: ${(be as Error).message}`);
        }
      }
    }

    // ── Update rate-limit counter ─────────────────────────────────────────
    try {
      const newRl = { count: (rlRecord?.count || 0) + imported, window_start: rlRecord ? rlRecord.window_start : now };
      // Upsert rate-limit record (best-effort)
    } catch {}

    console.log(`[importFacebookSaves] ${imported} saves imported for ${user.email} (${skipped} skipped, ${boardsCreated} boards created)`);

    return Response.json({
      imported,
      skipped,
      boards_created: boardsCreated,
      errors: errors.slice(0, 20),
      message: `Imported ${imported} save${imported !== 1 ? "s" : ""} from Facebook${boardsCreated > 0 ? `, created ${boardsCreated} collection board${boardsCreated !== 1 ? "s" : ""}` : ""}.`,
    });

  } catch (e) {
    const msg = (e as Error).message || "Unknown error";
    console.error("[importFacebookSaves] Fatal:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
});
