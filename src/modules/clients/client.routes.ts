import { FastifyInstance } from 'fastify';
import { getClients, createClient, updateClient, deleteClient } from './client.controller';
import { authenticate } from '../../plugins/authMiddleware';

export default async function (fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate); // Protect all client routes
  
  fastify.get('/', getClients);
  fastify.post('/', createClient);
  fastify.put('/:id', updateClient);
  fastify.delete('/:id', deleteClient);
}
