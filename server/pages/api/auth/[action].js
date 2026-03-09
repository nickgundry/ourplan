/**
 * /api/auth/[action].js
 *
 * Routes:
 *   POST /api/auth/register  — email + password
 *   POST /api/auth/login     — email + password
 *   POST /api/auth/google    — Google ID token from mobile
 *   POST /api/auth/apple     — Apple identity token from mobile
 *   POST /api/auth/reset     — request password reset email
 *   POST /api/auth/set-password — set new password via reset token
 */

import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import { Resend } from "resend";
import { signToken, withErrorHandler } from "../../../lib/auth";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function findOrCreateSocialUser({ email, name, provider, providerId }) {
  // Try to find by provider ID first
  const { rows: [existing] } = await sql`
    SELECT id, email FROM users
    WHERE provider = ${provider} AND provider_id = ${providerId}
    LIMIT 1
  `;
  if (existing) return existing;

  // Try to find by email (link accounts)
  const { rows: [byEmail] } = await sql`
    SELECT id, email FROM users WHERE email = ${email} LIMIT 1
  `;
  if (byEmail) {
    // Link the social provider to this existing account
    await sql`
      UPDATE users SET provider = ${provider}, provider_id = ${providerId}
      WHERE id = ${byEmail.id}
    `;
    return byEmail;
  }

  // New user
  const { rows: [created] } = await sql`
    INSERT INTO users (email, name, provider, provider_id, password)
    VALUES (${email}, ${name || email.split("@")[0]}, ${provider}, ${providerId}, '')
    RETURNING id, email
  `;

  // Bootstrap empty plan
  await sql`
    INSERT INTO plans (user_id, family, meeting, bag)
    VALUES (${created.id}, '[]', '{}', '[]')
    ON CONFLICT DO NOTHING
  `;

  return created;
}

async function bootstrapPlan(userId) {
  await sql`
    INSERT INTO plans (user_id, family, meeting, bag)
    VALUES (${userId}, '[]', '{}', '[]')
    ON CONFLICT DO NOTHING
  `;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function register(req, res) {
  const parsed = z.object({
    email:    z.string().email(),
    password: z.string().min(8),
    name:     z.string().min(1).optional(),
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password, name } = parsed.data;
  const hash = await bcrypt.hash(password, 12);

  const { rows: [user] } = await sql`
    INSERT INTO users (email, name, password, provider)
    VALUES (${email}, ${name || email.split("@")[0]}, ${hash}, 'email')
    ON CONFLICT (email) DO NOTHING
    RETURNING id, email, name
  `;

  if (!user) return res.status(409).json({ error: "Email already registered" });

  await bootstrapPlan(user.id);
  const token = signToken(user.id);
  return res.status(201).json({ token, userId: user.id, email: user.email, name: user.name });
}

async function login(req, res) {
  const parsed = z.object({
    email:    z.string().email(),
    password: z.string(),
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;

  const { rows: [user] } = await sql`
    SELECT id, email, name, password, provider FROM users WHERE email = ${email} LIMIT 1
  `;

  if (!user) return res.status(401).json({ error: "No account found with that email" });
  if (user.provider !== "email") return res.status(401).json({ error: `This account uses ${user.provider} sign-in` });
  if (!user.password) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Incorrect password" });

  const token = signToken(user.id);
  return res.status(200).json({ token, userId: user.id, email: user.email, name: user.name });
}

async function googleAuth(req, res) {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "Missing idToken" });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "Invalid Google token" });
  }

  const user = await findOrCreateSocialUser({
    email:      payload.email,
    name:       payload.name,
    provider:   "google",
    providerId: payload.sub,
  });

  const token = signToken(user.id);
  return res.status(200).json({ token, userId: user.id, email: user.email });
}

async function appleAuth(req, res) {
  const { identityToken, fullName } = req.body;
  if (!identityToken) return res.status(400).json({ error: "Missing identityToken" });

  let payload;
  try {
    payload = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_BUNDLE_ID,
      ignoreExpiration: false,
    });
  } catch {
    return res.status(401).json({ error: "Invalid Apple token" });
  }

  const name = fullName
    ? `${fullName.givenName || ""} ${fullName.familyName || ""}`.trim()
    : null;

  const user = await findOrCreateSocialUser({
    email:      payload.email,
    name,
    provider:   "apple",
    providerId: payload.sub,
  });

  const token = signToken(user.id);
  return res.status(200).json({ token, userId: user.id, email: user.email });
}

async function requestReset(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const { rows: [user] } = await sql`
    SELECT id FROM users WHERE email = ${email} AND provider = 'email' LIMIT 1
  `;

  // Always return 200 — don't reveal if email exists
  if (!user) return res.status(200).json({ ok: true });

  const resetToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await sql`
    UPDATE users
    SET reset_token = ${resetToken}, reset_expires = ${expires.toISOString()}
    WHERE id = ${user.id}
  `;

  // Send password reset email via Resend
  const base = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;
  const resetUrl = `${base}/reset/${resetToken}`;
  const fromEmail = process.env.EMAIL_FROM || "noreply@preparedapp.com";

  try {
    await resend.emails.send({
      from: fromEmail,
      to:   email,
      subject: "Reset your Prepared password",
      html: `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #1C1917;">
          <div style="margin-bottom: 32px;">
            <span style="font-size: 28px;">🛡</span>
            <span style="font-size: 20px; font-weight: 400; margin-left: 8px; color: #4A7C59;">Prepared</span>
          </div>
          <h1 style="font-size: 28px; font-weight: 400; margin: 0 0 16px; letter-spacing: -0.4px;">Reset your password</h1>
          <p style="font-size: 15px; color: #57534E; line-height: 1.6; margin: 0 0 28px;">
            Click the button below to choose a new password. This link expires in 1 hour.
          </p>
          <a href="${resetUrl}" style="display: inline-block; background: #4A7C59; color: white; text-decoration: none; border-radius: 12px; padding: 14px 28px; font-size: 15px; font-weight: 600;">
            Reset password
          </a>
          <p style="font-size: 12px; color: #A8A29E; margin-top: 28px; line-height: 1.6;">
            If you didn't request this, you can ignore this email. Your password won't change.<br>
            Link: ${resetUrl}
          </p>
        </div>
      `,
    });
  } catch (emailErr) {
    // Don't fail the request if email sending fails — log and move on
    console.error("Failed to send reset email:", emailErr);
  }

  return res.status(200).json({ ok: true });
}

async function setPassword(req, res) {
  const parsed = z.object({
    token:    z.string(),
    password: z.string().min(8),
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { token, password } = parsed.data;

  const { rows: [user] } = await sql`
    SELECT id FROM users
    WHERE reset_token = ${token}
      AND reset_expires > NOW()
    LIMIT 1
  `;

  if (!user) return res.status(400).json({ error: "Reset link is invalid or has expired" });

  const hash = await bcrypt.hash(password, 12);

  await sql`
    UPDATE users
    SET password = ${hash}, reset_token = NULL, reset_expires = NULL
    WHERE id = ${user.id}
  `;

  const jwtToken = signToken(user.id);
  return res.status(200).json({ token: jwtToken });
}

// ── Router ────────────────────────────────────────────────────────────────────

export default withErrorHandler(async function handler(req, res) {
  const { action } = req.query;

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  switch (action) {
    case "register":     return register(req, res);
    case "login":        return login(req, res);
    case "google":       return googleAuth(req, res);
    case "apple":        return appleAuth(req, res);
    case "reset":        return requestReset(req, res);
    case "set-password": return setPassword(req, res);
    default:             return res.status(404).json({ error: "Unknown auth action" });
  }
});
