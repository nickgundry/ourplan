import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth, signToken, withErrorHandler } from "../../../lib/auth";

/**
 * PATCH /api/auth/account — update name, email, or password
 * DELETE /api/auth/account — permanently delete account and all data
 */
export default withErrorHandler(async function handler(req, res) {
  if (req.method === "PATCH")  return updateAccount(req, res);
  if (req.method === "DELETE") return deleteAccount(req, res);
  res.status(405).json({ error: "Method not allowed" });
});

async function updateAccount(req, res) {
  const { userId } = requireAuth(req);
  const { name, email, currentPassword, newPassword } = req.body;

  const { rows: [user] } = await sql`
    SELECT id, email, password, provider FROM users WHERE id = ${userId}
  `;
  if (!user) return res.status(404).json({ error: "User not found" });

  // Require current password for email/password changes on email accounts
  if ((email || newPassword) && user.provider === "email") {
    if (!currentPassword) return res.status(400).json({ error: "Current password required" });
    const valid = await bcrypt.compare(currentPassword, user.password || "");
    if (!valid) return res.status(401).json({ error: "Incorrect password" });
  }

  // Build update
  const updates = {};
  if (name)        updates.name = name.trim();
  if (email)       updates.email = email.trim().toLowerCase();
  if (newPassword) updates.password = await bcrypt.hash(newPassword, 12);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  // Check email uniqueness
  if (updates.email && updates.email !== user.email) {
    const { rows: [existing] } = await sql`SELECT id FROM users WHERE email = ${updates.email}`;
    if (existing) return res.status(409).json({ error: "Email already in use" });
  }

  const { rows: [updated] } = await sql`
    UPDATE users SET
      name     = COALESCE(${updates.name ?? null}, name),
      email    = COALESCE(${updates.email ?? null}, email),
      password = COALESCE(${updates.password ?? null}, password)
    WHERE id = ${userId}
    RETURNING id, email, name, provider
  `;

  const token = signToken(updated.id);
  return res.status(200).json({
    token, userId: updated.id, email: updated.email, name: updated.name, isNew: false,
  });
}

async function deleteAccount(req, res) {
  const { userId } = requireAuth(req);
  const { password } = req.body;

  const { rows: [user] } = await sql`
    SELECT id, password, provider FROM users WHERE id = ${userId}
  `;
  if (!user) return res.status(404).json({ error: "User not found" });

  // Email users must confirm with their password
  if (user.provider === "email") {
    if (!password) return res.status(400).json({ error: "Password required to delete account" });
    const valid = await bcrypt.compare(password, user.password || "");
    if (!valid) return res.status(401).json({ error: "Incorrect password" });
  }

  // ON DELETE CASCADE handles plans, contacts, beacons, notifications
  await sql`DELETE FROM users WHERE id = ${userId}`;

  return res.status(200).json({ message: "Account deleted" });
}
