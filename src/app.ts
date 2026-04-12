import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';

export const buildApp = async () => {
  const app = Fastify({ logger: true });

  await app.register(fastifyCors, { origin: '*' });

  await app.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/', // Start serving pages at /
  });

  // Plugins
  await app.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_key_payflow'
  });

  // Global error handler
  app.setErrorHandler((error: any, request, reply) => {
    app.log.error(error);
    const statusCode = (error as any).statusCode || 500;
    reply.status(statusCode).send({
      success: false,
      message: error.message || 'Internal Server Error',
      data: null
    });
  });

  // Routes
  app.register(import('./modules/auth/auth.routes'), { prefix: '/auth' });
  app.register(import('./modules/clients/client.routes'), { prefix: '/clients' });
  app.register(import('./modules/invoices/invoice.routes'), { prefix: '/invoices' });
  app.register(import('./modules/reminders/reminder.routes'), { prefix: '/reminders' });
  app.register(import('./modules/payments/payment.routes'), { prefix: '/payments' });

  return app;
};
