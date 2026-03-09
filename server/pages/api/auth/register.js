import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken, withErrorHandler } from "../../../lib/auth";

const Schema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name:     z.string().min(1, "Name is required"),
});

/**
 * POST /api/auth/register
 */
export default withErrorHandler(async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
  }

  const { email, password, name } = parsed.data;
  const hash = await bcrypt.hash(password, 12);

  const { rows: [user] } = await sql`
    INSERT INTO users (email, password, name)
    VALUES (${email.toLowerCase().trim()}, ${hash}, ${name.trim()})
    ON CONFLICT (email) DO NOTHING
    RETURNING id, email, name
  `;

  if (!user) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  // Seed an empty plan
  await sql`
    INSERT INTO plans (user_id, family, meeting, bag)
    VALUES (${user.id}, '[]', '{}', '[]')
  `;

  const token = signToken(user.id);
  return res.status(201).json({
    token,
    userId: user.id,
    email:  user.email,
    name:   user.name,
    isNew:  true,   // ← tells the app to show onboarding
  });
});
