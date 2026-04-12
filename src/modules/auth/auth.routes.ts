import { FastifyInstance } from 'fastify';
import { registerHandler, loginHandler } from './auth.controller';

export default async function (fastify: FastifyInstance) {
  fastify.post('/register', registerHandler);
  fastify.post('/login', loginHandler);
}
