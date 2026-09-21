import type { FastifyInstance } from 'fastify';
import { pollIdParamSchema } from '@midnight-ballot/shared';
import type { PollService } from '../services/poll.service.js';
import { parseOrThrow } from '../middleware/validate.js';

export async function commitmentsRoutes(app: FastifyInstance, deps: { polls: PollService }): Promise<void> {
  app.get('/api/v1/polls/:id/commitments', async (request, reply) => {
    const { id } = parseOrThrow(pollIdParamSchema, request.params);
    reply.send({ data: await deps.polls.getCommitments(id) });
  });
}
