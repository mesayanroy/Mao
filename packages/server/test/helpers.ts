import type { PollMetadata, PollTally, PollCommitments, PollPhase } from '@maao/shared';
import type { PollRepository } from '../src/store/poll.repository.js';
import type { IndexerReader } from '../src/services/indexer.service.js';

export class InMemoryPollRepository implements PollRepository {
  private readonly polls = new Map<string, Omit<PollMetadata, 'phase'>>();
  private nextId = 1;

  async list(): Promise<PollMetadata[]> {
    return [...this.polls.values()].map((p) => ({ ...p, phase: 'Registration' }));
  }

  async get(id: string): Promise<PollMetadata | null> {
    const poll = this.polls.get(id);
    return poll ? { ...poll, phase: 'Registration' } : null;
  }

  async create(poll: Omit<PollMetadata, 'id' | 'phase'>): Promise<PollMetadata> {
    const id = `poll_${this.nextId++}`;
    const record = { id, ...poll };
    this.polls.set(id, record);
    return { ...record, phase: 'Registration' };
  }
}

export class FakeIndexerService implements IndexerReader {
  constructor(
    private readonly reachable = true,
    private readonly phase: PollPhase = 'Voting'
  ) {}

  async isReachable(): Promise<boolean> {
    return this.reachable;
  }

  async getPhase(): Promise<PollPhase> {
    return this.phase;
  }

  async getTally(): Promise<PollTally> {
    return { tally: [2, 1, 0, 0], totalVotes: 3, nullifierCount: 3, merkleRoot: 'abcd', phase: this.phase };
  }

  async getCommitments(): Promise<PollCommitments> {
    return { depth: 10, commitments: ['aa', 'bb'] };
  }
}
