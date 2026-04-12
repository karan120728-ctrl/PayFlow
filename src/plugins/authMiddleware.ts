import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../core/errors';

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Support JWT via URL query param (?token=...) for direct browser links like PDF downloads
    const queryToken = (request.query as any)?.token;
    if (queryToken && !request.headers.authorization) {
      request.headers.authorization = `Bearer ${queryToken}`;
    }
    await request.jwtVerify();
  } catch (err) {
    throw new UnauthorizedError("Invalid or missing token");
  }
};
