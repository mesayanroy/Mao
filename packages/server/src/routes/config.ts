import type { FastifyInstance } from 'fastify';
import type { ServerConfig } from '@midnight-ballot/shared';

export async function configRoutes(app: FastifyInstance, deps: { config: ServerConfig }): Promise<void> {
  app.get('/api/v1/config', async (_request, reply) => {
    reply.send({ data: deps.config });
  });
}
