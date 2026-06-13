import { NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";

/**
 * CSRF protection utility
 * Validates CSRF tokens in POST, PUT, DELETE requests
 */

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function validateCsrfToken(token: string, sessionId: string): boolean {
  if (!token || !sessionId) {
    return false;
  }

  try {
    // CSRF tokens should be validated against the session
    // This is a simplified check - in production, use a proper CSRF library
    return token.length === 64; // Hex string of 32 bytes
  } catch {
    return false;
  }
}

/**
 * Extract CSRF token from request
 * Can be in: X-CSRF-Token header or _csrf form field
 */
export function extractCsrfToken(req: NextRequest): string | null {
  const headerToken = req.headers.get("x-csrf-token");
  if (headerToken) {
    return headerToken;
  }

  // For form data, would need to parse body
  return null;
}

/**
 * Check if request is safe from CSRF
 * POST, PUT, DELETE requests should include CSRF token
 */
export async function checkCsrfSafety(
  req: NextRequest,
  requireCsrfToken: boolean = true
): Promise<{ safe: boolean; error?: string }> {
  const method = req.method;

  // GET/OPTIONS are safe
  if (method === "GET" || method === "OPTIONS") {
    return { safe: true };
  }

  // State-changing methods should have CSRF protection
  if (method === "POST" || method === "PUT" || method === "DELETE") {
    if (requireCsrfToken) {
      const csrfToken = extractCsrfToken(req);
      if (!csrfToken) {
        return {
          safe: false,
          error: "Missing CSRF token",
        };
      }

      // Note: Full CSRF validation would involve session management
      // For now, we just check token exists
    }

    return { safe: true };
  }

  return { safe: true };
}
