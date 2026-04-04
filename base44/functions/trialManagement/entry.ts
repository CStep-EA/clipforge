import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, plan } = await req.json();

    // Check for expired trials and auto-downgrade
    if (action === "checkExpiredTrials") {
      const trials = await base44.asServiceRole.entities.PremiumTrial.filter({
        user_email: user.email,
        is_active: true,
      });

      for (const trial of trials) {
        const now = new Date();
        const trialEnd = new Date(trial.trial_end);

        if (now > trialEnd) {
          // Mark trial as inactive (auto-downgrade happens in frontend)
          await base44.asServiceRole.entities.PremiumTrial.update(trial.id, {
            is_active: false,
          });

          console.log(`Trial expired for ${user.email}, marked inactive`);
        }
      }

      return Response.json({ success: true });
    }

    // Check if user can start trial
    if (action === "canStartTrial") {
      const existingTrial = await base44.asServiceRole.entities.PremiumTrial.filter({
        user_email: user.email,
        trial_plan: plan,
      });

      if (existingTrial.length > 0) {
        return Response.json({ canStart: false, reason: "Trial already used" });
      }

      return Response.json({ canStart: true });
    }

    // Apply referral bonus to subscription
    if (action === "applyReferralBonus") {
      const referralRecord = await base44.asServiceRole.entities.Referral.filter({
        referrer_email: user.email,
        bonus_applied: false,
        status: "rewarded",
      });

      if (referralRecord.length === 0) {
        return Response.json({ error: "No eligible bonus found" }, { status: 400 });
      }

      const bonus = referralRecord[0];

      // Update subscription based on bonus type
      const subscriptions = await base44.asServiceRole.entities.UserSubscription.filter({
        user_email: user.email,
      });

      if (subscriptions.length > 0) {
        const sub = subscriptions[0];
        let updatedData = { bonus_applied: true };

        if (bonus.bonus_type === "free_month") {
          // Extend period by 1 month
          const current = new Date(sub.current_period_end);
          const extended = new Date(current.getTime() + 30 * 24 * 60 * 60 * 1000);
          updatedData.current_period_end = extended.toISOString();
        }
        // For $5 credit, it would be tracked separately in Stripe

        await base44.asServiceRole.entities.UserSubscription.update(sub.id, updatedData);
        await base44.asServiceRole.entities.Referral.update(bonus.id, {
          bonus_applied: true,
        });

        console.log(`Applied ${bonus.bonus_type} bonus to ${user.email}`);
        return Response.json({ success: true, bonusType: bonus.bonus_type });
      }

      return Response.json({ error: "No subscription found" }, { status: 400 });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Trial management error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});