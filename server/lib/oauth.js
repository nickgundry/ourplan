import { sql } from "@vercel/postgres";
import { signToken } from "./auth";

/**
 * Find or create a user by OAuth provider identity.
 * Returns { token, userId, email, isNew }.
 */
export async function upsertOAuthUser({ provider, providerId, email, name, avatarUrl }) {
  // Try to find by provider identity first
  let { rows: [user] } = await sql`
    SELECT id, email, name FROM users
    WHERE provider = ${provider} AND provider_id = ${providerId}
    LIMIT 1
  `;

  // Fall back to matching by email if this provider was previously email-registered
  if (!user && email) {
    const { rows: [byEmail] } = await sql`
      SELECT id, email, name FROM users WHERE email = ${email} LIMIT 1
    `;
    if (byEmail) {
      // Attach provider identity to existing account
      await sql`
        UPDATE users SET provider = ${provider}, provider_id = ${providerId},
          avatar_url = ${avatarUrl || null}
        WHERE id = ${byEmail.id}
      `;
      user = byEmail;
    }
  }

  let isNew = false;

  if (!user) {
    // Create new user
    const { rows: [created] } = await sql`
      INSERT INTO users (email, name, provider, provider_id, avatar_url)
      VALUES (${email || null}, ${name || null}, ${provider}, ${providerId}, ${avatarUrl || null})
      RETURNING id, email, name
    `;
    user = created;
    isNew = true;

    // Bootstrap empty plan
    await sql`
      INSERT INTO plans (user_id, family, meeting, bag)
      VALUES (${user.id}, '[]', '{}', '[]')
    `;
  }

  const token = signToken(user.id);
  return { token, userId: user.id, email: user.email, name: user.name, isNew };
}
