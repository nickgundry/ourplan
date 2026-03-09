import { sql } from "@vercel/postgres";
import { z } from "zod";
import { requireAuth, withErrorHandler } from "../../../lib/auth";

const ContactSchema = z.object({
  name:     z.string().min(1),
  phone:    z.string().min(7),
  relation: z.string().optional(),
  outside:  z.boolean().default(false),
});

export default withErrorHandler(async function handler(req, res) {
  if (req.method === "GET")    return listContacts(req, res);
  if (req.method === "POST")   return createContact(req, res);
  if (req.method === "DELETE") return deleteContact(req, res);
  res.status(405).json({ error: "Method not allowed" });
});

/**
 * GET /api/contacts
 * Returns all contacts for the authenticated user.
 */
async function listContacts(req, res) {
  const { userId } = requireAuth(req);

  const { rows } = await sql`
    SELECT id, name, phone, relation, outside, created_at
    FROM contacts
    WHERE user_id = ${userId}
    ORDER BY created_at ASC
  `;

  return res.status(200).json(rows);
}

/**
 * POST /api/contacts
 * Create a new contact.
 * Body: { name, phone, relation?, outside? }
 */
async function createContact(req, res) {
  const { userId } = requireAuth(req);

  const parsed = ContactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { name, phone, relation, outside } = parsed.data;

  const { rows: [contact] } = await sql`
    INSERT INTO contacts (user_id, name, phone, relation, outside)
    VALUES (${userId}, ${name}, ${phone}, ${relation || null}, ${outside})
    RETURNING id, name, phone, relation, outside, created_at
  `;

  return res.status(201).json(contact);
}

/**
 * DELETE /api/contacts?id=xxx
 * Remove a contact by ID.
 */
async function deleteContact(req, res) {
  const { userId } = requireAuth(req);
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: "Missing contact id" });

  await sql`
    DELETE FROM contacts
    WHERE id = ${id} AND user_id = ${userId}
  `;

  return res.status(204).end();
}
