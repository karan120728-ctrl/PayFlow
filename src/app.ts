import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';

export const buildApp = async () => {
  const app = Fastify({ logger: true });

  // ✅ CORS — handles preflight OPTIONS automatically
  await app.register(fastifyCors, {
    origin: [
      'https://payflowapp.netlify.app',
      'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });
  
  // Plugins
  await app.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_key_payflow'
  });

  // Global error handler with detailed logging
  app.setErrorHandler((error: any, request, reply) => {
    app.log.error({
      message: error.message,
      statusCode: error.statusCode,
      url: request.url,
      method: request.method,
      stack: error.stack
    });
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

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return app;
};
