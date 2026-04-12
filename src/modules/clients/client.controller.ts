import { FastifyRequest, FastifyReply } from 'fastify';
import { ClientService } from './client.service';
import { createClientSchema, updateClientSchema } from './client.schema';
import { successResponse } from '../../core/response';

export const getClients = async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = (request.user as any).id;
  const clients = await ClientService.getAll(userId);
  return reply.send(successResponse(clients));
};

export const createClient = async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = (request.user as any).id;
  const result = createClientSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ success: false, message: 'Validation Error', data: result.error.issues });
  }

  const client = await ClientService.create(userId, result.data);
  return reply.status(201).send(successResponse(client, 'Client created successfully'));
};

export const updateClient = async (request: FastifyRequest<{ Params: { id: string }}>, reply: FastifyReply) => {
  const userId = (request.user as any).id;
  const clientId = parseInt(request.params.id);
  const result = updateClientSchema.safeParse(request.body);
  
  if (!result.success) {
    return reply.status(400).send({ success: false, message: 'Validation Error', data: result.error.issues });
  }

  await ClientService.update(userId, clientId, result.data);
  return reply.send(successResponse(null, 'Client updated successfully'));
};

export const deleteClient = async (request: FastifyRequest<{ Params: { id: string }}>, reply: FastifyReply) => {
  const userId = (request.user as any).id;
  const clientId = parseInt(request.params.id);
  
  await ClientService.delete(userId, clientId);
  return reply.send(successResponse(null, 'Client deleted successfully'));
};
