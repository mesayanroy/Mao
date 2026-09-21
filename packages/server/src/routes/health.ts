import type { FastifyInstance } from 'fastify';

export interface HealthCheckable {
  isReachable(): Promise<boolean>;
}

export async function healthRoutes(app: FastifyInstance, deps: { indexer: HealthCheckable }): Promise<void> {
  app.get('/health', async (_request, reply) => {
    const reachable = await deps.indexer.isReachable();
    const status = reachable ? 'ok' : 'degraded';
    reply.status(reachable ? 200 : 503).send({
      data: { status, chain: reachable ? 'reachable' : 'unreachable', indexer: reachable ? 'reachable' : 'unreachable' }
    });
  });
}
