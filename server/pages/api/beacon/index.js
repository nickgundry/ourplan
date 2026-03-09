import { sql } from "@vercel/postgres";
import { z } from "zod";
import { requireAuth, withErrorHandler } from "../../../lib/auth";
import { notifyContacts } from "../../../lib/notify";

const BeaconSchema = z.object({
  lat:       z.number(),
  lng:       z.number(),
  accuracy:  z.number().optional(),
  queued:    z.boolean().default(false), // true = was queued offline, now sending
  queuedAt:  z.string().optional(),      // ISO timestamp of original trigger
});

/**
 * POST /api/beacon
 *
 * This is the tiny 200-byte packet sent from the device.
 * The server handles all the heavy lifting:
 *   1. Save the beacon location
 *   2. Fetch the user's plan and contacts
 *   3. Fan out SMS notifications to all contacts
 *   4. Record notification delivery status
 *
 * Body: { lat, lng, accuracy?, queued?, queuedAt? }
 */
export default withErrorHandler(async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = requireAuth(req);

  const parsed = BeaconSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { lat, lng, accuracy, queued, queuedAt } = parsed.data;

  // 1. Save the beacon
  const { rows: [beacon] } = await sql`
    INSERT INTO beacons (user_id, lat, lng, accuracy, queued, sent_at)
    VALUES (${userId}, ${lat}, ${lng}, ${accuracy || null}, ${queued}, NOW())
    RETURNING id, lat, lng, created_at
  `;

  // 2. Fetch user info, plan, and contacts in parallel
  const [userResult, planResult, contactsResult] = await Promise.all([
    sql`SELECT email FROM users WHERE id = ${userId}`,
    sql`SELECT share_token, family, meeting FROM plans WHERE user_id = ${userId} LIMIT 1`,
    sql`SELECT id, name, phone, relation, outside FROM contacts WHERE user_id = ${userId}`,
  ]);

  const user = userResult.rows[0];
  const plan = planResult.rows[0];
  const contacts = contactsResult.rows;

  if (!plan || contacts.length === 0) {
    // Nothing to notify — return early with the beacon saved
    return res.status(200).json({
      beaconId: beacon.id,
      notified: 0,
      message: "Beacon saved. No contacts to notify.",
    });
  }

  // Derive sender name from plan family (first member = primary contact)
  const senderName =
    (plan.family?.[0]?.name) || user.email.split("@")[0] || "Your contact";

  // 3. Fan out SMS — server-side, not from device
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;

  const results = await notifyContacts({
    contacts,
    plan,
    beacon,
    senderName,
    baseUrl,
  });

  // 4. Record notification status
  if (results.length > 0) {
    for (const r of results) {
      await sql`
        INSERT INTO notifications (beacon_id, contact_id, status, sent_at)
        VALUES (
          ${beacon.id},
          ${r.contactId},
          ${r.error ? "failed" : "sent"},
          ${r.error ? null : "NOW()"}
        )
      `;
    }
  }

  const sent = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;

  return res.status(200).json({
    beaconId: beacon.id,
    notified: sent,
    failed,
    results,
  });
});
