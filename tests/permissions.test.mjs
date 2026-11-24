import test from "node:test";
import assert from "node:assert/strict";

// Permission helper to test group authorization rules
function canManageGroup(role) {
  return role === "OWNER" || role === "ADMIN";
}

function canDeleteGroup(role) {
  return role === "OWNER";
}

function canDeleteMessageForEveryone(senderId, currentUserId, userRole) {
  return senderId === currentUserId || userRole === "ADMIN";
}

test("Permissions - Group Management Rules", () => {
  assert.equal(canManageGroup("OWNER"), true);
  assert.equal(canManageGroup("ADMIN"), true);
  assert.equal(canManageGroup("MEMBER"), false);

  assert.equal(canDeleteGroup("OWNER"), true);
  assert.equal(canDeleteGroup("ADMIN"), false);
  assert.equal(canDeleteGroup("MEMBER"), false);
});

test("Permissions - Delete Message For Everyone", () => {
  const authorId = "user_1";
  const otherUserId = "user_2";

  // Author can delete their own message
  assert.equal(canDeleteMessageForEveryone(authorId, authorId, "USER"), true);

  // Other regular user cannot delete
  assert.equal(canDeleteMessageForEveryone(authorId, otherUserId, "USER"), false);

  // Platform admin can moderate/delete
  assert.equal(canDeleteMessageForEveryone(authorId, otherUserId, "ADMIN"), true);
});
