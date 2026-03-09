import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken, withErrorHandler } from "../../lib/auth";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export default withErrorHandler(async function handler(req, res) {
  if (req.method === "POST" && req.url.endsWith("/register")) {
    return register(req, res);
  }
  if (req.method === "POST" && req.url.endsWith("/login")) {
    return login(req, res);
  }
  res.status(405).json({ error: "Method not allowed" });
});

async function register(req, res) {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { email, password, name } = parsed.data;
  const hash = await bcrypt.hash(password, 12);

  // Create user
  const { rows: [user] } = await sql`
    INSERT INTO users (email, password)
    VALUES (${email}, ${hash})
    ON CONFLICT (email) DO NOTHING
    RETURNING id, email
  `;

  if (!user) {
    return res.status(409).json({ error: "Email already registered" });
  }

  // Create an empty plan for this user
  await sql`
    INSERT INTO plans (user_id, family, meeting, bag)
    VALUES (${user.id}, '[]', '{}', '[]')
  `;

  const token = signToken(user.id);
  return res.status(201).json({ token, userId: user.id, email: user.email });
}

async function login(req, res) {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;

  const { rows: [user] } = await sql`
    SELECT id, email, password FROM users WHERE email = ${email}
  `;

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken(user.id);
  return res.status(200).json({ token, userId: user.id, email: user.email });
}
