import type { PollMetadata, PollTally, PollCommitments, CreatePollRequest } from '@maao/shared';
import type { PollRepository } from '../store/poll.repository.js';
import type { IndexerReader } from './indexer.service.js';

export class PollNotFoundError extends Error {
  constructor(id: string) {
    super(`poll not found: ${id}`);
  }
}

export class PollService {
  constructor(
    private readonly repository: PollRepository,
    private readonly indexer: IndexerReader
  ) {}

  async list(): Promise<PollMetadata[]> {
    const polls = await this.repository.list();
    return Promise.all(
      polls.map(async (poll) => ({ ...poll, phase: await this.indexer.getPhase(poll.contractAddress) }))
    );
  }

  async get(id: string): Promise<PollMetadata> {
    const poll = await this.repository.get(id);
    if (!poll) throw new PollNotFoundError(id);
    return { ...poll, phase: await this.indexer.getPhase(poll.contractAddress) };
  }

  async create(request: CreatePollRequest): Promise<PollMetadata> {
    return this.repository.create(request);
  }

  async getTally(id: string): Promise<PollTally> {
    const poll = await this.repository.get(id);
    if (!poll) throw new PollNotFoundError(id);
    return this.indexer.getTally(poll.contractAddress);
  }

  async getCommitments(id: string): Promise<PollCommitments> {
    const poll = await this.repository.get(id);
    if (!poll) throw new PollNotFoundError(id);
    return this.indexer.getCommitments(poll.contractAddress);
  }
}
