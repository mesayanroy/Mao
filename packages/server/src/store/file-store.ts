// Simple JSON-file-backed PollRepository. Adequate for the MVP's single
// small write path (organizer creates a poll); an SQLite implementation can
// replace this behind the same interface without touching routes/services.
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { PollMetadata } from '@maao/shared';
import type { PollRepository } from './poll.repository.js';

interface FileStoreRecord {
  readonly id: string;
  readonly title: string;
  readonly options: readonly string[];
  readonly contractAddress: string;
}

export class FileStore implements PollRepository {
  private readonly filePath: string;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = join(dataDir, 'polls.json');
  }

  async list(): Promise<PollMetadata[]> {
    const records = await this.readAll();
    return records.map((r) => ({ ...r, phase: 'Registration' as const }));
  }

  async get(id: string): Promise<PollMetadata | null> {
    const records = await this.readAll();
    const record = records.find((r) => r.id === id);
    return record ? { ...record, phase: 'Registration' as const } : null;
  }

  async create(poll: Omit<PollMetadata, 'id' | 'phase'>): Promise<PollMetadata> {
    const record: FileStoreRecord = { id: randomUUID(), ...poll };
    await this.mutate((records) => [...records, record]);
    return { ...record, phase: 'Registration' };
  }

  private async readAll(): Promise<FileStoreRecord[]> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      return JSON.parse(raw) as FileStoreRecord[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }

  /** Serializes writes so concurrent create() calls can't clobber each other. */
  private async mutate(fn: (records: FileStoreRecord[]) => FileStoreRecord[]): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const current = await this.readAll();
      const next = fn(current);
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, JSON.stringify(next, null, 2), 'utf-8');
    });
    await this.writeQueue;
  }
}
