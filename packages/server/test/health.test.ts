import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { PollService } from '../src/services/poll.service.js';
import { loadEnv } from '../src/env.js';
import { createLogger } from '../src/logger.js';
import { InMemoryPollRepository, FakeIndexerService } from './helpers.js';

function testEnv() {
  return loadEnv({ NETWORK_ID: 'undeployed', PORT: '8080' } as NodeJS.ProcessEnv);
}

describe('GET /health', () => {
  it('returns 200 ok when the indexer is reachable', async () => {
    const env = testEnv();
    const indexer = new FakeIndexerService(true);
    const polls = new PollService(new InMemoryPollRepository(), indexer);
    const app = await buildApp({ env, logger: createLogger(env), indexer, polls });

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: { status: 'ok', chain: 'reachable', indexer: 'reachable' } });
  });

  it('returns 503 degraded when the indexer is unreachable', async () => {
    const env = testEnv();
    const indexer = new FakeIndexerService(false);
    const polls = new PollService(new InMemoryPollRepository(), indexer);
    const app = await buildApp({ env, logger: createLogger(env), indexer, polls });

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json().data.status).toBe('degraded');
  });
});
