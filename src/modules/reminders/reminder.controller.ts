import { FastifyRequest, FastifyReply } from 'fastify';
import { ReminderService } from './reminder.service';
import { sendReminderSchema } from './reminder.schema';
import { successResponse } from '../../core/response';

export const sendReminderHandler = async (request: FastifyRequest<{ Params: { invoiceId: string } }>, reply: FastifyReply) => {
  const userId = (request.user as any).id;
  const invoiceId = parseInt(request.params.invoiceId);

  const result = sendReminderSchema.safeParse({
    invoice_id: invoiceId,
    template: (request.body as any)?.template || "reminder",
    type: (request.body as any)?.type || "email"
  });
  
  if (!result.success) {
    return reply.status(400).send({ success: false, message: 'Validation Error', data: result.error.issues });
  }

  const reminder = await ReminderService.sendManualReminder(userId, result.data);
  return reply.status(200).send(successResponse(reminder, 'Reminder sent successfully'));
};

export const getReminderPreviewHandler = async (request: FastifyRequest<{ Params: { invoiceId: string }, Querystring: { template?: string, type?: string } }>, reply: FastifyReply) => {
  const userId = (request.user as any).id;
  const invoiceId = parseInt(request.params.invoiceId);
  const template = (request.query.template as any) || 'reminder';
  const type = (request.query.type as any) || 'email';

  const preview = await ReminderService.getPreviewText(userId, invoiceId, template, type);
  return reply.status(200).send(successResponse({ text: preview }, 'Preview generated'));
};

