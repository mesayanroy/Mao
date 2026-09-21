import type { FastifyInstance } from 'fastify';
import { pollIdParamSchema, sponsorRequestSchema } from '@midnight-ballot/shared';
import type { SponsorService } from '../services/sponsor.service.js';
import { parseOrThrow } from '../middleware/validate.js';
import { sponsorRateLimitConfig } from '../middleware/rate-limit.js';
import { ApiError } from '../middleware/error.js';

export interface SponsorDeps {
  readonly enabled: boolean;
  readonly rateLimitPerMinute: number;
  readonly sponsor?: SponsorService;
}

export async function sponsorRoutes(app: FastifyInstance, deps: SponsorDeps): Promise<void> {
  app.post('/api/v1/polls/:id/sponsor', { config: sponsorRateLimitConfig(deps.rateLimitPerMinute) }, async (request, reply) => {
    if (!deps.enabled || !deps.sponsor) {
      throw new ApiError(501, 'SPONSOR_DISABLED', 'DUST sponsorship is not enabled on this server');
    }
    parseOrThrow(pollIdParamSchema, request.params);
    const { finalizedTx } = parseOrThrow(sponsorRequestSchema, request.body);
    const result = await deps.sponsor.sponsor(finalizedTx);
    reply.send({ data: result });
  });
}
