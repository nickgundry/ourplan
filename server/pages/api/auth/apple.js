import appleSignin from "apple-signin-auth";
import { z } from "zod";
import { withErrorHandler } from "../../../lib/auth";
import { upsertOAuthUser } from "../../../lib/oauth";

const Schema = z.object({
  identityToken: z.string(),
  // Apple only sends name on the FIRST sign-in; we capture it then
  fullName: z.object({
    givenName: z.string().nullable().optional(),
    familyName: z.string().nullable().optional(),
  }).optional(),
});

/**
 * POST /api/auth/apple
 *
 * Receives the Apple identity token from the device after Sign in with Apple.
 * Verifies it with Apple's public keys, then upserts the user.
 *
 * Apple's identity token is a JWT signed by Apple. We verify it using
 * apple-signin-auth which fetches Apple's public keys automatically.
 */
export default withErrorHandler(async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { identityToken, fullName } = parsed.data;

  // Verify the token with Apple
  let applePayload;
  try {
    applePayload = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_BUNDLE_ID || "com.prepared.app",
      ignoreExpiration: false,
    });
  } catch (err) {
    console.error("Apple token verification failed:", err);
    return res.status(401).json({ error: "Invalid Apple identity token" });
  }

  const providerId = applePayload.sub; // Apple's stable user identifier
  const email = applePayload.email || null;
  const name = fullName
    ? [fullName.givenName, fullName.familyName].filter(Boolean).join(" ") || null
    : null;

  const result = await upsertOAuthUser({
    provider: "apple",
    providerId,
    email,
    name,
    avatarUrl: null, // Apple doesn't provide an avatar
  });

  return res.status(200).json(result);
});
