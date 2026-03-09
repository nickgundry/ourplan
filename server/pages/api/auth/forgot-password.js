import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { z } from "zod";
import { withErrorHandler } from "../../../lib/auth";

const Schema = z.object({ email: z.string().email() });

/**
 * POST /api/auth/forgot-password
 * Generates a reset token and sends an email.
 * Always returns 200 even if email not found — don't reveal user existence.
 */
export default withErrorHandler(async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid email" });

  const { email } = parsed.data;

  const { rows: [user] } = await sql`
    SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}
  `;

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token (add reset_token, reset_expires columns to users table)
    await sql`
      UPDATE users
      SET reset_token = ${token}, reset_expires = ${expires.toISOString()}
      WHERE id = ${user.id}
    `;

    const base = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const resetUrl = `${base}/reset-password?token=${token}`;

    // Send via your email provider
    // For MVP, log to console — swap for SendGrid/Resend in production
    console.log(`Password reset link for ${email}:\n${resetUrl}`);

    // TODO: replace with:
    // await sendEmail({ to: email, subject: "Reset your Prepared password", body: resetUrl });
  }

  // Always 200 — never reveal whether email was found
  return res.status(200).json({ message: "If that email is registered, you'll receive a reset link shortly." });
});
