import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      rating,
      wentWell,
      needsImprovement,
      bugOrFeature,
      email,
      allowContact,
      screenshotDataUrl,
      userAgent,
      page,
    } = body;

    if (!rating || rating < 1 || rating > 5) {
      return Response.json({ error: 'Invalid rating. Must be 1–5.' }, { status: 400 });
    }

    // Build the content string for the feedback item
    const parts = [];
    parts.push(`⭐ Rating: ${rating}/5`);
    if (wentWell?.trim()) parts.push(`✅ What worked well:\n${wentWell.trim()}`);
    if (needsImprovement?.trim()) parts.push(`🔧 Needs improvement:\n${needsImprovement.trim()}`);
    if (bugOrFeature?.trim()) parts.push(`🐛 Bug / Feature:\n${bugOrFeature.trim()}`);
    if (allowContact && email) parts.push(`📧 Follow-up OK: ${email}`);
    if (page) parts.push(`📍 Page: ${page}`);
    if (userAgent) parts.push(`🖥 UA: ${userAgent.slice(0, 120)}`);

    const content = parts.join('\n\n');

    // Determine priority based on rating
    let priority = 'medium';
    if (rating <= 2) priority = 'high';
    if (rating === 1) priority = 'urgent';
    if (rating >= 4) priority = 'low';

    // Save as a FeedbackItem
    const feedbackItem = await base44.asServiceRole.entities.FeedbackItem.create({
      source: 'manual',
      author: user.email,
      content,
      sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral',
      sentiment_score: (rating - 3) / 2, // normalise -1 to 1
      category: bugOrFeature?.trim() ? 'bug' : rating <= 2 ? 'complaint' : rating >= 4 ? 'praise' : 'other',
      priority,
      keywords: ['beta-feedback'],
    });

    // If bug/feature text is present, optionally auto-create a support ticket
    if (bugOrFeature?.trim() && (priority === 'high' || priority === 'urgent')) {
      await base44.asServiceRole.entities.SupportTicket.create({
        subject: `[Beta Feedback] ${bugOrFeature.trim().slice(0, 80)}`,
        message: content,
        category: 'bug',
        priority,
        status: 'open',
      });
      console.log('[submitBetaFeedback] Auto-created support ticket for high-priority feedback');
    }

    // Optionally send email alert to admin for 1-star ratings
    if (rating === 1) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'admin@clipforge.app',
          subject: '🚨 1-Star Beta Feedback Received',
          body: `A beta user left 1-star feedback.\n\nUser: ${user.email}\nPage: ${page}\n\n${content}`,
        });
      } catch (emailErr) {
        console.warn('[submitBetaFeedback] Could not send admin email alert:', emailErr.message);
      }
    }

    console.log(`[submitBetaFeedback] Feedback saved: ${feedbackItem.id} | rating=${rating} | user=${user.email}`);

    return Response.json({ success: true, feedbackId: feedbackItem.id });
  } catch (error) {
    console.error('[submitBetaFeedback] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});