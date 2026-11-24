import test from "node:test";
import assert from "node:assert/strict";
import sanitizeHtml from "sanitize-html";
import { sendMessageSchema, editMessageSchema } from "../src/lib/validations/message.ts";

test("Messages - XSS sanitization strips dangerous tags and scripts", () => {
  const maliciousInput = "<script>alert('xss')</script>Hello <b>World</b><img src=x onerror=alert(1)>";
  const sanitized = sanitizeHtml(maliciousInput, {
    allowedTags: [],
    allowedAttributes: {},
  });

  assert.equal(sanitized, "Hello World");
  assert.equal(sanitized.includes("<script>"), false);
  assert.equal(sanitized.includes("onerror"), false);
});

test("Messages - Validation for message types and payloads", () => {
  const validText = sendMessageSchema.safeParse({
    content: "Hello from ChatSphere!",
    type: "TEXT",
  });
  assert.equal(validText.success, true);

  const validVoice = sendMessageSchema.safeParse({
    type: "VOICE",
    voiceDuration: 12,
  });
  assert.equal(validVoice.success, true);

  const invalidType = sendMessageSchema.safeParse({
    content: "Test",
    type: "UNKNOWN_TYPE",
  });
  assert.equal(invalidType.success, false);
});

test("Messages - Edit message requires non-empty content", () => {
  const valid = editMessageSchema.safeParse({
    content: "Updated message text",
  });
  assert.equal(valid.success, true);

  const empty = editMessageSchema.safeParse({
    content: "",
  });
  assert.equal(empty.success, false);
});
