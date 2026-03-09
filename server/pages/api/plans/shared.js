import { sql } from "@vercel/postgres";
import { withErrorHandler } from "../../../lib/auth";

/**
 * GET /api/plans/shared?token=xxx
 * Public endpoint — no auth required.
 * Used by outside contacts who receive a share link.
 * Returns a read-only view of the plan (no medical detail for privacy).
 */
export default withErrorHandler(async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  const { rows: [plan] } = await sql`
    SELECT
      p.id,
      p.family,
      p.meeting,
      p.updated_at
    FROM plans p
    WHERE p.share_token = ${token}
    LIMIT 1
  `;

  if (!plan) {
    return res.status(404).json({ error: "Plan not found" });
  }

  // Strip medication details from the public view
  const safeFamily = (plan.family || []).map(member => ({
    name: member.name,
    conditions: member.conditions || null,
    // Do NOT expose medications to public share link
  }));

  return res.status(200).json({
    meeting: plan.meeting,
    family: safeFamily,
    updatedAt: plan.updated_at,
  });
});
