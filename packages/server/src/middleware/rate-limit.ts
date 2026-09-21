import type { FastifyInstance } from 'fastify';

/** Per-route rate limit config for the sponsor endpoint (docs/API.md RATE_LIMITED). */
export function sponsorRateLimitConfig(perMinute: number): Parameters<FastifyInstance['route']>[0]['config'] {
  return {
    rateLimit: {
      max: perMinute,
      timeWindow: '1 minute'
    }
  };
}
