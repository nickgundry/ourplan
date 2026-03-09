import { sql } from "@vercel/postgres";
import { requireAuth, withErrorHandler } from "../../../lib/auth";

export default withErrorHandler(async function handler(req, res) {
  if (req.method === "GET") return getPlan(req, res);
  if (req.method === "PUT") return updatePlan(req, res);
  res.status(405).json({ error: "Method not allowed" });
});

/**
 * GET /api/plans
 * Returns the authenticated user's plan.
 */
async function getPlan(req, res) {
  const { userId } = requireAuth(req);

  const { rows: [plan] } = await sql`
    SELECT id, share_token, family, meeting, bag, updated_at
    FROM plans
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  if (!plan) {
    return res.status(404).json({ error: "No plan found" });
  }

  return res.status(200).json(plan);
}

/**
 * PUT /api/plans
 * Full plan upsert — replaces family, meeting places, and bag.
 * Body: { family: [], meeting: {}, bag: [] }
 */
async function updatePlan(req, res) {
  const { userId } = requireAuth(req);
  const { family, meeting, bag } = req.body;

  const { rows: [plan] } = await sql`
    UPDATE plans
    SET
      family     = ${JSON.stringify(family || [])}::jsonb,
      meeting    = ${JSON.stringify(meeting || {})}::jsonb,
      bag        = ${JSON.stringify(bag || [])}::jsonb,
      updated_at = NOW()
    WHERE user_id = ${userId}
    RETURNING id, share_token, family, meeting, bag, updated_at
  `;

  if (!plan) {
    // First time — insert
    const { rows: [newPlan] } = await sql`
      INSERT INTO plans (user_id, family, meeting, bag)
      VALUES (
        ${userId},
        ${JSON.stringify(family || [])}::jsonb,
        ${JSON.stringify(meeting || {})}::jsonb,
        ${JSON.stringify(bag || [])}::jsonb
      )
      RETURNING id, share_token, family, meeting, bag, updated_at
    `;
    return res.status(201).json(newPlan);
  }

  return res.status(200).json(plan);
}
