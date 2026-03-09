import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { withErrorHandler } from "../../../lib/auth";
import { upsertOAuthUser } from "../../../lib/oauth";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const Schema = z.object({ idToken: z.string() });

/**
 * POST /api/auth/google
 * Receives the Google ID token from the device, verifies it, upserts the user.
 */
export default withErrorHandler(async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (err) {
    return res.status(401).json({ error: "Invalid Google token" });
  }

  const payload = ticket.getPayload();
  const result = await upsertOAuthUser({
    provider:   "google",
    providerId: payload.sub,
    email:      payload.email,
    name:       payload.name,
    avatarUrl:  payload.picture,
  });

  return res.status(200).json(result);
});
