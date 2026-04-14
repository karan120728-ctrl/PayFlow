import { FastifyRequest, FastifyReply } from 'fastify';
import { ReminderService } from './reminder.service';
import { sendReminderSchema } from './reminder.schema';
import { successResponse } from '../../core/response';

export const sendReminderHandler = async (request: FastifyRequest<{ Params: { invoiceId: string } }>, reply: FastifyReply) => {
  try {
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
    
    // Check if the reminder actually got delivered or failed
    if (reminder.status === 'failed') {
      const type = result.data.type;
      let reason = 'Delivery failed.';
      if (type === 'email' && !process.env.SMTP_HOST) {
        reason = 'SMTP email is not configured on the server. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.';
      } else if (type === 'whatsapp' && !process.env.WHATSAPP_ACCESS_TOKEN) {
        reason = 'WhatsApp API is not configured on the server. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_ID environment variables.';
      }
      return reply.status(500).send({ 
        success: false, 
        message: `${type === 'email' ? 'Email' : 'WhatsApp'} could not be sent. ${reason}`,
        data: reminder 
      });
    }

    return reply.status(200).send(successResponse(reminder, 'Reminder sent successfully'));
  } catch (err: any) {
    console.error('[Reminder] sendReminderHandler error:', err);
    return reply.status(err.statusCode || 500).send({
      success: false,
      message: err.message || 'Failed to send reminder',
      data: null
    });
  }
};

export const getReminderPreviewHandler = async (request: FastifyRequest<{ Params: { invoiceId: string }, Querystring: { template?: string, type?: string } }>, reply: FastifyReply) => {
  const userId = (request.user as any).id;
  const invoiceId = parseInt(request.params.invoiceId);
  const template = (request.query.template as any) || 'reminder';
  const type = (request.query.type as any) || 'email';

  const preview = await ReminderService.getPreviewText(userId, invoiceId, template, type);
  return reply.status(200).send(successResponse({ text: preview }, 'Preview generated'));
};
