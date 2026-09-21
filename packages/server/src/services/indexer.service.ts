// Read-only on-chain queries. Only ever reads PUBLIC ledger state — see
// docs/THREAT_MODEL.md "Server holds no voter identity data."
import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import {
  bytesToHex,
  computeVotersRoot,
  readBallotPublicState,
  type PollCommitments,
  type PollPhase,
  type PollTally
} from '@midnight-ballot/shared';

const PHASE_NAMES: readonly PollPhase[] = ['Registration', 'Voting', 'Closed'];

/** Narrow read surface PollService depends on — lets tests use a plain fake instead of the real class. */
export interface IndexerReader {
  getPhase(contractAddress: string): Promise<PollPhase>;
  getTally(contractAddress: string): Promise<PollTally>;
  getCommitments(contractAddress: string): Promise<PollCommitments>;
}

export class IndexerService implements IndexerReader {
  constructor(private readonly publicDataProvider: PublicDataProvider) {}

  async isReachable(): Promise<boolean> {
    try {
      // A cheap, always-valid query: fetch the (non-existent) zero address.
      // A reachable indexer answers `null`; an unreachable one throws.
      await this.publicDataProvider.queryContractState('0'.repeat(64));
      return true;
    } catch {
      return false;
    }
  }

  async getPhase(contractAddress: string): Promise<PollPhase> {
    const ledger = await readBallotPublicState(this.publicDataProvider, contractAddress);
    return PHASE_NAMES[Number(ledger.phase)] ?? 'Registration';
  }

  async getCommitments(contractAddress: string): Promise<PollCommitments> {
    const ledger = await readBallotPublicState(this.publicDataProvider, contractAddress);
    // `ledger.voters` iteration assumed by analogy with the confirmed Map/Set
    // ledger-field convention — see docs/DECISIONS.md "Inferred" section.
    const commitments = [...(ledger.voters as Iterable<Uint8Array>)].map(bytesToHex);
    return { depth: 10, commitments };
  }

  async getTally(contractAddress: string): Promise<PollTally> {
    const ledger = await readBallotPublicState(this.publicDataProvider, contractAddress);
    const tally = [
      Number(ledger.tally0),
      Number(ledger.tally1),
      Number(ledger.tally2),
      Number(ledger.tally3)
    ];
    const nullifierCount = Number(ledger.nullifiers.size());
    const commitments = [...(ledger.voters as Iterable<Uint8Array>)];
    return {
      tally,
      totalVotes: tally.reduce((a, b) => a + b, 0),
      nullifierCount,
      merkleRoot: computeVotersRoot(commitments),
      phase: PHASE_NAMES[Number(ledger.phase)] ?? 'Registration'
    };
  }
}
