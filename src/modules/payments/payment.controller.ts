import { FastifyRequest, FastifyReply } from 'fastify';
import { PaymentService } from './payment.service';
import { successResponse } from '../../core/response';

export const createPaymentOrder = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const userId = (request.user as any).id;
  const invoiceId = parseInt(request.params.id);
  const order = await PaymentService.createOrder(userId, invoiceId);
  return reply.send(successResponse(order, 'Order created'));
};

export const verifyPayment = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const userId = (request.user as any).id;
  const invoiceId = parseInt(request.params.id);
  const body = request.body as any;

  const result = await PaymentService.verifyAndCapture(userId, invoiceId, {
    razorpay_order_id: body.razorpay_order_id,
    razorpay_payment_id: body.razorpay_payment_id,
    razorpay_signature: body.razorpay_signature,
  });

  return reply.send(successResponse(result, 'Payment captured successfully'));
};
