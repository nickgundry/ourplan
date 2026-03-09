import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken, withErrorHandler } from "../../../lib/auth";

const Schema = z.object({
  token:    z.string().min(32),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * POST /api/auth/reset-password
 * Validates the token and sets a new password.
 */
export default withErrorHandler(async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid request" });
  }

  const { token, password } = parsed.data;

  const { rows: [user] } = await sql`
    SELECT id, email FROM users
    WHERE reset_token = ${token}
      AND reset_expires > NOW()
  `;

  if (!user) {
    return res.status(400).json({ error: "This reset link has expired or is invalid. Please request a new one." });
  }

  const hash = await bcrypt.hash(password, 12);

  await sql`
    UPDATE users
    SET password = ${hash}, reset_token = NULL, reset_expires = NULL
    WHERE id = ${user.id}
  `;

  // Sign in automatically after reset
  const newToken = signToken(user.id);
  return res.status(200).json({ token: newToken, userId: user.id, email: user.email });
});
