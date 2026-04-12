import {z} from 'zod';

export const sendReminderSchema = z.object({
  invoice_id: z.number().int().positive("Invoice ID is missing"),
  template: z.enum(["friendly", "reminder", "urgent"]),
  type: z.enum(["email", "sms", "whatsapp"]).default("email")
});

export type SendReminderInput = z.infer<typeof sendReminderSchema>;
