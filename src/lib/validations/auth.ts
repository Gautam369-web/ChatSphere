import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50).optional(),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional(),
  bio: z.string().max(200).optional().nullable(),
  statusMessage: z.string().max(100).optional().nullable(),
  image: z.string().trim().url("Avatar URL must be a valid URL").optional().or(z.literal("")).nullable(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  soundEnabled: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  privacyLastSeen: z.enum(["everyone", "contacts", "nobody"]).optional(),
  privacyReadReceipts: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
