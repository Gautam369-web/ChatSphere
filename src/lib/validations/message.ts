import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z.string().max(4000).optional().nullable(),
  type: z
    .enum(["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE", "VOICE", "SYSTEM", "CALL"])
    .default("TEXT"),
  replyToId: z.string().optional().nullable(),
  mediaUrl: z.string().url().optional().nullable().or(z.literal("")),
  fileName: z.string().max(255).optional().nullable(),
  fileSize: z.number().int().nonnegative().optional().nullable(),
  voiceDuration: z.number().int().nonnegative().optional().nullable(),
  voiceWaveform: z.string().optional().nullable(),
});

export const editMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(4000),
});

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export const createConversationSchema = z.object({
  recipientId: z.string().optional(), // for 1-to-1
  isGroup: z.boolean().default(false),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
  isChannel: z.boolean().default(false),
});
