import { FastifyRequest, FastifyReply } from 'fastify';
import { InvoiceService } from './invoice.service';
import { InvoicePDFService } from './invoice.pdf';
import { createInvoiceSchema, updateInvoiceStatusSchema } from './invoice.schema';
import { successResponse } from '../../core/response';

export const getInvoices = async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = (request.user as any).id;
  const invoices = await InvoiceService.getAll(userId);
  return reply.send(successResponse(invoices));
};

export const getDashboardSummary = async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = (request.user as any).id;
  const summary = await InvoiceService.getSummary(userId);
  return reply.send(successResponse(summary));
}

export const createInvoice = async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = (request.user as any).id;
  const result = createInvoiceSchema.safeParse(request.body);
  
  if (!result.success) {
    return reply.status(400).send({ success: false, message: 'Validation Error', data: result.error.issues });
  }

  const invoice = await InvoiceService.create(userId, result.data);
  return reply.status(201).send(successResponse(invoice, 'Invoice created successfully'));
};

export const updateInvoiceStatus = async (request: FastifyRequest<{ Params: { id: string }}>, reply: FastifyReply) => {
  try {
    const userId = (request.user as any).id;
    const invoiceId = parseInt(request.params.id);

    console.log(`[Invoice] Updating status — userId: ${userId}, invoiceId: ${invoiceId}, body:`, request.body);

    if (isNaN(invoiceId)) {
      return reply.status(400).send({ success: false, message: 'Invalid invoice ID', data: null });
    }

    const result = updateInvoiceStatusSchema.safeParse(request.body);
    
    if (!result.success) {
      console.error('[Invoice] Validation failed:', result.error.issues);
      return reply.status(400).send({ success: false, message: 'Validation Error: ' + result.error.issues.map((i: any) => i.message).join(', '), data: result.error.issues });
    }

    await InvoiceService.updateStatus(userId, invoiceId, result.data);
    return reply.send(successResponse(null, 'Invoice status updated successfully'));
  } catch (err: any) {
    console.error('[Invoice] updateInvoiceStatus error:', err);
    const statusCode = err.statusCode || 500;
    return reply.status(statusCode).send({
      success: false,
      message: err.message || 'Failed to update invoice status',
      data: null
    });
  }
};

export const downloadInvoicePDF = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  const userId = (request.user as any).id;
  const invoiceId = parseInt(request.params.id);
  const pdfBuffer = await InvoicePDFService.generate(userId, invoiceId);
  reply.header('Content-Type', 'application/pdf');
  reply.header('Content-Disposition', `attachment; filename="invoice-${invoiceId}.pdf"`);
  return reply.send(pdfBuffer);
};
