/**
 * /api/account/[action].js
 *
 * Routes (all require auth):
 *   GET  /api/account/me          — get profile
 *   PUT  /api/account/email       — change email
 *   PUT  /api/account/password    — change password
 *   DELETE /api/account/delete    — permanently delete account + all data
 */

import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth, withErrorHandler } from "../../../lib/auth";

async function getMe(req, res) {
  const { userId } = requireAuth(req);

  const { rows: [user] } = await sql`
    SELECT id, email, name, provider, created_at FROM users WHERE id = ${userId} LIMIT 1
  `;

  if (!user) return res.status(404).json({ error: "User not found" });

  return res.status(200).json({
    id:        user.id,
    email:     user.email,
    name:      user.name,
    provider:  user.provider,
    createdAt: user.created_at,
  });
}

async function changeEmail(req, res) {
  const { userId } = requireAuth(req);

  const parsed = z.object({
    email:    z.string().email(),
    password: z.string(), // confirm identity
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;

  const { rows: [user] } = await sql`
    SELECT password, provider FROM users WHERE id = ${userId} LIMIT 1
  `;

  if (user.provider !== "email") {
    return res.status(400).json({ error: `Email can't be changed for ${user.provider} sign-in accounts` });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Incorrect password" });

  // Check new email isn't taken
  const { rows: [conflict] } = await sql`
    SELECT id FROM users WHERE email = ${email} AND id != ${userId} LIMIT 1
  `;
  if (conflict) return res.status(409).json({ error: "That email is already in use" });

  await sql`UPDATE users SET email = ${email} WHERE id = ${userId}`;

  return res.status(200).json({ email });
}

async function changePassword(req, res) {
  const { userId } = requireAuth(req);

  const parsed = z.object({
    currentPassword: z.string(),
    newPassword:     z.string().min(8),
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { currentPassword, newPassword } = parsed.data;

  const { rows: [user] } = await sql`
    SELECT password, provider FROM users WHERE id = ${userId} LIMIT 1
  `;

  if (user.provider !== "email") {
    return res.status(400).json({ error: `Password can't be changed for ${user.provider} sign-in accounts` });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

  const hash = await bcrypt.hash(newPassword, 12);
  await sql`UPDATE users SET password = ${hash} WHERE id = ${userId}`;

  return res.status(200).json({ ok: true });
}

async function deleteAccount(req, res) {
  const { userId } = requireAuth(req);

  const { password, confirmation } = req.body;

  // Require the user to type "DELETE" to confirm
  if (confirmation !== "DELETE") {
    return res.status(400).json({ error: 'Type DELETE to confirm account deletion' });
  }

  const { rows: [user] } = await sql`
    SELECT password, provider FROM users WHERE id = ${userId} LIMIT 1
  `;

  // Email accounts must confirm with password
  if (user.provider === "email") {
    if (!password) return res.status(400).json({ error: "Password required to delete account" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Incorrect password" });
  }

  // Cascade delete — ON DELETE CASCADE handles plans, contacts, beacons
  await sql`DELETE FROM users WHERE id = ${userId}`;

  return res.status(200).json({ deleted: true });
}

// ── Router ────────────────────────────────────────────────────────────────────

export default withErrorHandler(async function handler(req, res) {
  const { action } = req.query;

  switch (`${req.method}:${action}`) {
    case "GET:me":              return getMe(req, res);
    case "PUT:email":           return changeEmail(req, res);
    case "PUT:password":        return changePassword(req, res);
    case "DELETE:delete":       return deleteAccount(req, res);
    default:                    return res.status(404).json({ error: "Unknown account action" });
  }
});
