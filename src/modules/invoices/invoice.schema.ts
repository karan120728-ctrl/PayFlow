import {z} from 'zod';

export const createInvoiceSchema = z.object({
  client_id: z.number().int().positive("Client ID must be valid"),
  amount: z.number().positive("Amount must be positive"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD")
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(["pending", "paid", "overdue"])
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;
