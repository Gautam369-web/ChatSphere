import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { registerSchema, loginSchema } from "../src/lib/validations/auth.ts";

test("Auth Validation - Register schema requires valid fields", () => {
  // Valid registration
  const valid = registerSchema.safeParse({
    name: "Alice Johnson",
    username: "alice_j",
    email: "alice@chatsphere.io",
    password: "password123",
  });
  assert.equal(valid.success, true);

  // Invalid email
  const invalidEmail = registerSchema.safeParse({
    name: "Alice Johnson",
    username: "alice_j",
    email: "not-an-email",
    password: "password123",
  });
  assert.equal(invalidEmail.success, false);

  // Password too short (<6 chars)
  const shortPass = registerSchema.safeParse({
    name: "Alice Johnson",
    username: "alice_j",
    email: "alice@chatsphere.io",
    password: "123",
  });
  assert.equal(shortPass.success, false);
});

test("Auth - Password hashing and bcrypt comparison", async () => {
  const plain = "SuperSecretP@ss123";
  const hashed = await bcrypt.hash(plain, 10);

  const isMatch = await bcrypt.compare(plain, hashed);
  assert.equal(isMatch, true);

  const isWrongMatch = await bcrypt.compare("WrongPassword", hashed);
  assert.equal(isWrongMatch, false);
});

test("Auth Validation - Login schema requires non-empty email and password", () => {
  const valid = loginSchema.safeParse({
    email: "bob@chatsphere.io",
    password: "password123",
  });
  assert.equal(valid.success, true);

  const empty = loginSchema.safeParse({
    email: "bob@chatsphere.io",
    password: "",
  });
  assert.equal(empty.success, false);
});
