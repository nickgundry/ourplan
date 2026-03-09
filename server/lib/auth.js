import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "90d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Extract and verify the Bearer token from an API request.
 * Returns { userId } or throws a 401 response shape.
 */
export function requireAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  if (!token) throw { status: 401, message: "Unauthorized" };

  const payload = verifyToken(token);
  if (!payload) throw { status: 401, message: "Invalid or expired token" };

  return { userId: payload.sub };
}

/** Wrap API handlers with consistent error handling */
export function withErrorHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
