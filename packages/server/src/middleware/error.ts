import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { PollNotFoundError } from '../services/poll.service.js';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export function errorHandler(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply): void {
  if (error instanceof ApiError) {
    reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof ZodError) {
    reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    return;
  }
  if (error instanceof PollNotFoundError) {
    reply.status(404).send({ error: { code: 'NOT_FOUND', message: error.message } });
    return;
  }
  request.log.error({ err: error }, 'unhandled request error');
  reply.status(500).send({ error: { code: 'INTERNAL', message: 'internal server error' } });
}
