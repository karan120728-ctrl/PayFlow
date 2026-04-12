import { FastifyInstance } from 'fastify';
import { getInvoices, getDashboardSummary, createInvoice, updateInvoiceStatus, downloadInvoicePDF } from './invoice.controller';
import { authenticate } from '../../plugins/authMiddleware';

export default async function (fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);
  
  fastify.get('/', getInvoices);
  fastify.get('/summary', getDashboardSummary);
  fastify.get('/:id/pdf', downloadInvoicePDF);
  fastify.post('/', createInvoice);
  fastify.put('/:id/status', updateInvoiceStatus);
}
