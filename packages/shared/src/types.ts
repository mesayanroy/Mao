// Domain types shared by server and client. Mirrors docs/API.md exactly —
// if you change a shape here, update that doc (and vice versa).

export type PollPhase = 'Registration' | 'Voting' | 'Closed';

export interface PollMetadata {
  readonly id: string;
  readonly title: string;
  readonly options: readonly string[];
  readonly contractAddress: string;
  readonly phase: PollPhase;
}

export interface PollTally {
  readonly tally: readonly number[];
  readonly totalVotes: number;
  readonly nullifierCount: number;
  readonly merkleRoot: string;
  readonly phase: PollPhase;
}

export interface PollCommitments {
  readonly depth: number;
  readonly commitments: readonly string[];
}

export interface ServerConfig {
  readonly networkId: string;
  readonly indexerUrl: string;
  readonly indexerWsUrl: string;
  readonly zkConfigUrl: string;
}

export interface ApiError {
  readonly code: string;
  readonly message: string;
}

export type ApiResult<T> = { readonly data: T } | { readonly error: ApiError };
