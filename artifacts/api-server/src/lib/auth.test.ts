import test from "node:test";
import assert from "node:assert/strict";

import { normalizeRole, isAllowedRoleTransition } from "./auth";

test("normalizeRole accepts canonical form and uppercases variants", () => {
  assert.equal(normalizeRole("SUPER_ADMIN"), "SUPER_ADMIN");
  assert.equal(normalizeRole("super_admin"), "SUPER_ADMIN");
  assert.equal(normalizeRole("Admin"), "ADMIN");
});

test("role transitions reject privilege escalation", () => {
  assert.equal(isAllowedRoleTransition("OPERATOR", "ADMIN"), false);
  assert.equal(isAllowedRoleTransition("ADMIN", "SUPER_ADMIN"), false);
  assert.equal(isAllowedRoleTransition("ADMIN", "OPERATOR"), true);
});
