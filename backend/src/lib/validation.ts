import { z } from "zod";

// Socket event payload schemas

export const messageSendSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  content: z.string().min(1, "Message cannot be empty").max(2000, "Message too long"),
});


export const redraftSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  lastMessageId: z.string().uuid("Invalid message ID"),
  tone: z.enum(["friendly", "professional", "empathetic", "persuasive"]),
});

export const ticketResolveSchema = z.string().uuid("Invalid conversation ID");

/**
 * Validates a payload against a Zod schema.
 * Returns the parsed data on success, or null on failure.
 */
export function validatePayload<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn("[Validation] Invalid payload:", result.error.flatten());
  return null;
}
