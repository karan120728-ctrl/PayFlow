import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema } from './auth.schema';
import { successResponse } from '../../core/response';

export const registerHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const result = registerSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ success: false, message: 'Validation Error', data: result.error.issues });
  }

  const user = await AuthService.register(result.data);
  const token = await reply.jwtSign({ id: user.id, email: user.email });

  return reply.status(201).send(successResponse({ user, token }, 'Registration successful'));
};

export const loginHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const result = loginSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ success: false, message: 'Validation Error', data: result.error.issues });
  }

  const user = await AuthService.login(result.data);
  const token = await reply.jwtSign({ id: user.id, email: user.email });

  return reply.status(200).send(successResponse({ user, token }, 'Login successful'));
};
