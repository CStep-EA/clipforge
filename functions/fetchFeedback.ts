import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const runId = `run_${Date.now()}`;

    // Load config (take first record or use defaults)
    const configs = await base44.asServiceRole.entities.FeedbackConfig.list();
    const config = configs[0] || {};
    const enabledSources = config.sources?.length ? config.sources : ['reddit', 'producthunt', 'twitter', 'g2', 'appstore', 'cnet', 'pcmag', 'wired', 'facebook'];
    const keywords = config.keywords?.length ? config.keywords : ['ClipForge', 'clip forge', 'social saving app', 'content organizer'];
    const escalationThreshold = config.escalation_threshold || 'urgent';
    const autoTicket = config.auto_ticket !== false;

    const appName = 'ClipForge';
    const keywordStr = keywords.join(', ');

    // Use AI with internet context to fetch real mentions across sources
    const feedbackPrompt = `Search the web for recent user reviews, mentions, and feedback about "${appName}" (a social media content saving & AI organization app) from these sources: Reddit, Product Hunt, G2, Capterra, App Store reviews, Google Play Store, Twitter/X, TechCrunch, CNET. 

Search keywords: ${keywordStr}

For each mention found, return structured data. Find at least 8-12 diverse mentions if possible. Include both positive and negative feedback.

Return ONLY a JSON object matching this exact schema:
{
  "items": [
    {
      "source": "reddit|twitter|producthunt|g2|capterra|appstore|playstore|technews|manual",
      "source_url": "URL if available or empty string",
      "author": "username or source name",
      "content": "the actual review/feedback text (100-300 chars)",
      "sentiment": "positive|negative|neutral|mixed",
      "sentiment_score": number between -1 and 1,
      "category": "bug|feature_request|praise|complaint|question|other",
      "keywords": ["array", "of", "matched", "keywords"],
      "ai_summary": "1-sentence summary",
      "priority": "low|medium|high|urgent"
    }
  ],
  "summary": "Overall sentiment summary in 2-3 sentences",
  "top_issues": ["issue1", "issue2", "issue3"],
  "top_praise": ["praise1", "praise2"],
  "sentiment_breakdown": {"positive": 0, "negative": 0, "neutral": 0, "mixed": 0}
}

Rules:
- Mark as "urgent" priority: explicit bug reports, crashes, data loss complaints, or angry users threatening to leave
- Mark as "high" priority: repeated feature requests, moderate complaints  
- Only include sources that are enabled: ${enabledSources.join(', ')}
- Be realistic - if no real data found for a source, skip it rather than fabricate`;

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: feedbackPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          items: { type: "array", items: { type: "object" } },
          summary: { type: "string" },
          top_issues: { type: "array", items: { type: "string" } },
          top_praise: { type: "array", items: { type: "string" } },
          sentiment_breakdown: { type: "object" }
        }
      }
    });

    const items = analysis?.items || [];
    let ticketsCreated = 0;

    // Persist each feedback item and auto-create tickets
    for (const item of items) {
      const shouldEscalate = autoTicket && (
        item.priority === 'urgent' ||
        (escalationThreshold === 'high' && (item.priority === 'high' || item.priority === 'urgent'))
      );

      let ticketId = null;
      if (shouldEscalate && (item.category === 'bug' || item.category === 'complaint')) {
        const ticket = await base44.asServiceRole.entities.SupportTicket.create({
          subject: `[Auto] ${item.source.toUpperCase()}: ${item.ai_summary || item.content.slice(0, 80)}`,
          message: `**Source:** ${item.source}\n**Author:** ${item.author || 'Unknown'}\n**URL:** ${item.source_url || 'N/A'}\n\n**Feedback:**\n${item.content}\n\n**AI Analysis:** Sentiment ${item.sentiment} (score: ${item.sentiment_score?.toFixed(2)}). Category: ${item.category}.`,
          status: 'open',
          priority: item.priority === 'urgent' ? 'urgent' : 'high',
          category: item.category === 'bug' ? 'bug' : 'general',
        });
        ticketId = ticket.id;
        ticketsCreated++;
      }

      await base44.asServiceRole.entities.FeedbackItem.create({
        ...item,
        fetch_run_id: runId,
        ticket_created: !!ticketId,
        ticket_id: ticketId || undefined,
      });
    }

    // Update config last_run
    if (configs[0]) {
      await base44.asServiceRole.entities.FeedbackConfig.update(configs[0].id, { last_run: new Date().toISOString() });
    }

    console.log(`[fetchFeedback] Run ${runId}: fetched ${items.length} items, created ${ticketsCreated} tickets`);

    return Response.json({
      run_id: runId,
      items_fetched: items.length,
      tickets_created: ticketsCreated,
      summary: analysis?.summary || '',
      top_issues: analysis?.top_issues || [],
      top_praise: analysis?.top_praise || [],
      sentiment_breakdown: analysis?.sentiment_breakdown || {},
    });
  } catch (error) {
    console.error('[fetchFeedback] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});