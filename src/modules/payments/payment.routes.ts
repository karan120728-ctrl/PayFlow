import { FastifyInstance } from 'fastify';
import { createPaymentOrder, verifyPayment } from './payment.controller';
import { authenticate } from '../../plugins/authMiddleware';

export default async function (fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);
  fastify.post('/:id/order', createPaymentOrder);
  fastify.post('/:id/verify', verifyPayment);
}
