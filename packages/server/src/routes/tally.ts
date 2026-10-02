import type { FastifyInstance } from 'fastify';
import { pollIdParamSchema } from '@maao/shared';
import type { PollService } from '../services/poll.service.js';
import { parseOrThrow } from '../middleware/validate.js';

export async function tallyRoutes(app: FastifyInstance, deps: { polls: PollService }): Promise<void> {
  app.get('/api/v1/polls/:id/tally', async (request, reply) => {
    const { id } = parseOrThrow(pollIdParamSchema, request.params);
    reply.send({ data: await deps.polls.getTally(id) });
  });
}
