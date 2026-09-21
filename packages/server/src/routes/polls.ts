import type { FastifyInstance } from 'fastify';
import { createPollRequestSchema, pollIdParamSchema } from '@midnight-ballot/shared';
import type { PollService } from '../services/poll.service.js';
import { parseOrThrow } from '../middleware/validate.js';

export async function pollsRoutes(app: FastifyInstance, deps: { polls: PollService }): Promise<void> {
  app.get('/api/v1/polls', async (_request, reply) => {
    reply.send({ data: await deps.polls.list() });
  });

  app.post('/api/v1/polls', async (request, reply) => {
    const body = parseOrThrow(createPollRequestSchema, request.body);
    const poll = await deps.polls.create(body);
    reply.status(201).send({ data: poll });
  });

  app.get('/api/v1/polls/:id', async (request, reply) => {
    const { id } = parseOrThrow(pollIdParamSchema, request.params);
    reply.send({ data: await deps.polls.get(id) });
  });
}
