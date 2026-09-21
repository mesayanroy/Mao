import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { Logger } from './logger.js';
import type { Env } from './env.js';
import type { PollService } from './services/poll.service.js';
import type { SponsorService } from './services/sponsor.service.js';
import { errorHandler } from './middleware/error.js';
import { healthRoutes, type HealthCheckable } from './routes/health.js';
import { configRoutes } from './routes/config.js';
import { pollsRoutes } from './routes/polls.js';
import { tallyRoutes } from './routes/tally.js';
import { commitmentsRoutes } from './routes/commitments.js';
import { sponsorRoutes } from './routes/sponsor.js';

export interface AppDeps {
  readonly env: Env;
  readonly logger: Logger;
  readonly indexer: HealthCheckable;
  readonly polls: PollService;
  readonly sponsor?: SponsorService;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ loggerInstance: deps.logger, bodyLimit: 256 * 1024 });

  await app.register(helmet, { contentSecurityPolicy: false });
  const allowedOrigins = deps.env.CORS_ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  await app.register(cors, { origin: allowedOrigins.length > 0 ? allowedOrigins : false });
  await app.register(rateLimit, { global: false });

  app.setErrorHandler(errorHandler);

  await app.register((instance) => healthRoutes(instance, { indexer: deps.indexer }));
  await app.register((instance) =>
    configRoutes(instance, {
      config: {
        networkId: deps.env.NETWORK_ID,
        indexerUrl: deps.env.INDEXER_URL ?? '',
        indexerWsUrl: deps.env.INDEXER_WS_URL ?? '',
        zkConfigUrl: deps.env.ZK_CONFIG_URL
      }
    })
  );
  await app.register((instance) => pollsRoutes(instance, { polls: deps.polls }));
  await app.register((instance) => tallyRoutes(instance, { polls: deps.polls }));
  await app.register((instance) => commitmentsRoutes(instance, { polls: deps.polls }));
  await app.register((instance) =>
    sponsorRoutes(instance, {
      enabled: deps.env.SPONSOR_ENABLED,
      rateLimitPerMinute: deps.env.SPONSOR_RATE_LIMIT_PER_MINUTE,
      sponsor: deps.sponsor
    })
  );

  return app;
}
