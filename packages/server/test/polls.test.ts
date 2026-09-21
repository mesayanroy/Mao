import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { PollService } from '../src/services/poll.service.js';
import { loadEnv } from '../src/env.js';
import { createLogger } from '../src/logger.js';
import { InMemoryPollRepository, FakeIndexerService } from './helpers.js';

async function testApp() {
  const env = loadEnv({ NETWORK_ID: 'undeployed', PORT: '8080' } as NodeJS.ProcessEnv);
  const indexer = new FakeIndexerService(true, 'Voting');
  const repository = new InMemoryPollRepository();
  const polls = new PollService(repository, indexer);
  const app = await buildApp({ env, logger: createLogger(env), indexer, polls });
  return { app, repository };
}

describe('polls routes', () => {
  it('POST /api/v1/polls creates a poll, GET lists it with live phase', async () => {
    const { app } = await testApp();

    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/polls',
      payload: { title: 'Approve budget', options: ['Yes', 'No'], contractAddress: 'ab'.repeat(32) }
    });
    expect(create.statusCode).toBe(201);
    const created = create.json().data;
    expect(created.id).toBeTruthy();

    const list = await app.inject({ method: 'GET', url: '/api/v1/polls' });
    expect(list.statusCode).toBe(200);
    expect(list.json().data).toHaveLength(1);
    expect(list.json().data[0].phase).toBe('Voting');
  });

  it('POST /api/v1/polls rejects an invalid options count', async () => {
    const { app } = await testApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/polls',
      payload: { title: 'x', options: ['only one'], contractAddress: 'ab'.repeat(32) }
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/polls/:id 404s for an unknown poll', async () => {
    const { app } = await testApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/polls/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('GET /api/v1/polls/:id/tally returns the public tally', async () => {
    const { app } = await testApp();
    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/polls',
      payload: { title: 'x', options: ['Yes', 'No', 'Abstain'], contractAddress: 'cd'.repeat(32) }
    });
    const id = create.json().data.id;

    const tally = await app.inject({ method: 'GET', url: `/api/v1/polls/${id}/tally` });
    expect(tally.statusCode).toBe(200);
    const data = tally.json().data;
    expect(data.totalVotes).toBe(data.nullifierCount);
  });

  it('GET /api/v1/polls/:id/commitments returns the ordered commitment list', async () => {
    const { app } = await testApp();
    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/polls',
      payload: { title: 'x', options: ['Yes', 'No'], contractAddress: 'ef'.repeat(32) }
    });
    const id = create.json().data.id;

    const res = await app.inject({ method: 'GET', url: `/api/v1/polls/${id}/commitments` });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.commitments).toEqual(['aa', 'bb']);
  });
});

describe('sponsor route', () => {
  it('returns 501 SPONSOR_DISABLED when sponsorship is off', async () => {
    const { app } = await testApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/polls/whatever/sponsor',
      payload: { finalizedTx: 'ab' }
    });
    expect(res.statusCode).toBe(501);
    expect(res.json().error.code).toBe('SPONSOR_DISABLED');
  });
});
