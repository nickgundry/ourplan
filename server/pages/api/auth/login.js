import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken, withErrorHandler } from "../../../lib/auth";

const Schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/login
 */
export default withErrorHandler(async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Please enter a valid email and password" });
  }

  const { email, password } = parsed.data;

  const { rows: [user] } = await sql`
    SELECT id, email, name, password FROM users
    WHERE email = ${email.toLowerCase().trim()}
  `;

  // Deliberate generic message — don't reveal whether email exists
  if (!user) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }

  const token = signToken(user.id);
  return res.status(200).json({
    token,
    userId: user.id,
    email:  user.email,
    name:   user.name,
    isNew:  false,
  });
});
