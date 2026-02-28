import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { sentryCaptureError } from './sentryCaptureError.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 100 requests/hour per user
    const rlRes = await base44.functions.invoke('rateLimiter', {
      userEmail: user.email, endpoint: 'deepResearch', limit: 100, windowMinutes: 60
    });
    if (!rlRes.data?.allowed) {
      return Response.json(
        { error: `Rate limit exceeded. Try again in ${rlRes.data?.retryAfterSeconds}s.` },
        { status: 429, headers: { 'Retry-After': String(rlRes.data?.retryAfterSeconds || 3600) } }
      );
    }

    // Check subscription — only pro/premium may use deep research
    const subs = await base44.asServiceRole.entities.UserSubscription.filter({ user_email: user.email });
    const plan = subs?.[0]?.plan || 'free';
    if (plan === 'free') {
      return Response.json({ error: 'upgrade_required', plan }, { status: 403 });
    }

    const { url, title, description, itemId } = await req.json();
    if (!url && !title) return Response.json({ error: 'url or title required' }, { status: 400 });

    let pageText = '';

    // Fetch & extract text from the URL
    if (url) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ClipForgeBot/1.0)' },
          signal: AbortSignal.timeout(8000),
        });
        const html = await res.text();
        // Strip HTML tags to get plain text
        pageText = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 6000); // limit tokens
      } catch (e) {
        console.error('Fetch failed:', e.message);
      }
    }

    const prompt = `You are a deep research assistant. Analyze this web content and provide a comprehensive research report.

Title: ${title || 'Unknown'}
Description: ${description || ''}
URL: ${url || 'N/A'}
Page Content: ${pageText || '(could not fetch page — use title/description only)'}

Return a detailed research report with:
1. Executive summary (2-3 sentences)
2. Key insights (3-5 bullet points)
3. Sentiment (positive/neutral/negative with reason)
4. Related topics to explore
5. Relevance score 1-10 with reason
6. Action recommendation (buy/save/skip/research more)`;

    const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
    let research;

    if (OPENAI_KEY) {
      const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'deep_research',
              schema: {
                type: 'object',
                properties: {
                  summary: { type: 'string' },
                  key_insights: { type: 'array', items: { type: 'string' } },
                  sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                  sentiment_reason: { type: 'string' },
                  related_topics: { type: 'array', items: { type: 'string' } },
                  relevance_score: { type: 'number' },
                  relevance_reason: { type: 'string' },
                  action: { type: 'string', enum: ['buy', 'save', 'skip', 'research_more'] },
                  action_reason: { type: 'string' },
                },
                required: ['summary', 'key_insights', 'sentiment', 'related_topics', 'relevance_score', 'action'],
                additionalProperties: false,
              },
              strict: true,
            },
          },
        }),
      });
      const oaiData = await oaiRes.json();
      research = JSON.parse(oaiData.choices?.[0]?.message?.content || '{}');
    } else {
      // Fallback: use Base44 InvokeLLM
      research = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            key_insights: { type: 'array', items: { type: 'string' } },
            sentiment: { type: 'string' },
            sentiment_reason: { type: 'string' },
            related_topics: { type: 'array', items: { type: 'string' } },
            relevance_score: { type: 'number' },
            relevance_reason: { type: 'string' },
            action: { type: 'string' },
            action_reason: { type: 'string' },
          },
        },
      });
    }

    // Persist deep research back onto the item
    if (itemId) {
      await base44.asServiceRole.entities.SavedItem.update(itemId, {
        ai_summary: research.summary,
        rating: research.relevance_score,
      });
    }

    return Response.json({ research });
  } catch (error) {
    console.error('deepResearch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});