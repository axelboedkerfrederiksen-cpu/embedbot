import assert from "node:assert/strict";
import test from "node:test";
import { createPreviewToken, verifyPreviewToken } from "../lib/preview-access.ts";

test("preview tokens verify for the intended business until expiry", () => {
  const token = createPreviewToken("business-1", "test-secret", 2_000);

  assert.equal(verifyPreviewToken(token, "business-1", "test-secret", 1_999), true);
  assert.equal(verifyPreviewToken(token, "business-1", "test-secret", 2_000), false);
  assert.equal(verifyPreviewToken(token, "business-2", "test-secret", 1_999), false);
});

test("preview tokens reject tampering and a different secret", () => {
  const token = createPreviewToken("business-1", "test-secret", 2_000);
  const parts = token.split(".");
  parts[2] = "3000";

  assert.equal(verifyPreviewToken(parts.join("."), "business-1", "test-secret", 1_999), false);
  assert.equal(verifyPreviewToken(token, "business-1", "other-secret", 1_999), false);
});
