import { FastifyInstance } from 'fastify';
import { sendReminderHandler, getReminderPreviewHandler } from './reminder.controller';
import { authenticate } from '../../plugins/authMiddleware';

export default async function (fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);
  
  // POST /reminders/send/:invoiceId
  fastify.post('/send/:invoiceId', sendReminderHandler);

  // GET /reminders/preview/:invoiceId
  fastify.get('/preview/:invoiceId', getReminderPreviewHandler);
}

