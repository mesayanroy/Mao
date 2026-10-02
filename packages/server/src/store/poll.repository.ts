import type { PollMetadata } from '@maao/shared';

/**
 * Off-chain poll metadata store (title/options/contract address — never
 * voter data). File-backed by default (see file-store.ts); swap in a
 * SQLite implementation later by implementing this same interface — see
 * docs/TASKS.md.
 */
export interface PollRepository {
  list(): Promise<PollMetadata[]>;
  get(id: string): Promise<PollMetadata | null>;
  create(poll: Omit<PollMetadata, 'id' | 'phase'>): Promise<PollMetadata>;
}
