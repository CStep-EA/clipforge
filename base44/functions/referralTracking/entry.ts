import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, referralCode, referredEmail, referrerEmail } = await req.json();

    // Track referral signup
    if (action === "trackReferralSignup") {
      if (!referralCode || !referredEmail) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
      }

      // Decode referral code to find referrer
      const possibleEmails = await base44.asServiceRole.entities.Referral.filter({
        referral_code: referralCode,
      });

      if (possibleEmails.length === 0) {
        return Response.json({ error: "Invalid referral code" }, { status: 400 });
      }

      const referrer = possibleEmails[0].referrer_email;

      // Create referral record
      const existingRef = await base44.asServiceRole.entities.Referral.filter({
        referrer_email: referrer,
        referred_email: referredEmail,
      });

      if (existingRef.length > 0) {
        // Update status
        await base44.asServiceRole.entities.Referral.update(existingRef[0].id, {
          status: "signed_up",
        });
      } else {
        // Create new referral record
        await base44.asServiceRole.entities.Referral.create({
          referrer_email: referrer,
          referral_code: referralCode,
          referred_email: referredEmail,
          status: "signed_up",
          bonus_type: "none",
        });
      }

      console.log(`Referral tracked: ${referredEmail} from code ${referralCode}`);
      return Response.json({ success: true, referrer });
    }

    // Reward referrer on subscription
    if (action === "rewardReferrer") {
      const user = await base44.auth.me();
      if (!user?.email) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Find referral record
      const referrals = await base44.asServiceRole.entities.Referral.filter({
        referred_email: user.email,
        status: "signed_up",
      });

      if (referrals.length === 0) {
        return Response.json({ error: "No referral found" }, { status: 400 });
      }

      const referral = referrals[0];
      const bonusType = Math.random() > 0.5 ? "free_month" : "credit_5";

      // Update referral as subscribed and add bonus
      await base44.asServiceRole.entities.Referral.update(referral.id, {
        status: "subscribed",
        bonus_type: bonusType,
        bonus_applied: false,
      });

      // Mark for referrer to claim
      const referrerUpdate = await base44.asServiceRole.entities.Referral.filter({
        referrer_email: referral.referrer_email,
        referred_email: user.email,
      });

      if (referrerUpdate.length > 0) {
        await base44.asServiceRole.entities.Referral.update(referrerUpdate[0].id, {
          status: "rewarded",
          bonus_type: bonusType,
        });
      }

      console.log(`Referrer ${referral.referrer_email} earned ${bonusType}`);
      return Response.json({ success: true, bonusType });
    }

    // Get referral stats for user
    if (action === "getStats") {
      const user = await base44.auth.me();
      if (!user?.email) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const referrals = await base44.asServiceRole.entities.Referral.filter({
        referrer_email: user.email,
      });

      const stats = {
        total: referrals.length,
        pending: referrals.filter((r) => r.status === "pending").length,
        signedUp: referrals.filter((r) => r.status === "signed_up").length,
        subscribed: referrals.filter((r) => r.status === "subscribed").length,
        rewarded: referrals.filter((r) => r.status === "rewarded").length,
        earnings: {
          freeMonths: referrals.filter((r) => r.bonus_type === "free_month" && r.status === "rewarded").length,
          credits: referrals.filter((r) => r.bonus_type === "credit_5" && r.status === "rewarded").length,
        },
      };

      return Response.json(stats);
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Referral tracking error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});