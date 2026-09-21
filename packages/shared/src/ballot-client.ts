// Thin wrapper around @midnight-ntwrk/midnight-js-contracts for
// ballot.compact, used by both the browser client (with a
// dapp-connector-backed proof provider) and organizer CLI scripts (with a
// local proof server). See docs/ARCHITECTURE.md and docs/WALLET_INTEGRATION.md.
//
// NOTE (see docs/DECISIONS.md "Open items"): the exact `CompiledContract`
// construction below (`CompiledContract.make(...).pipe(withWitnesses(...),
// withCompiledFileAssets(...))`) was confirmed by downloading and reading
// the real `@midnight-ntwrk/compact-js` / `@midnight-ntwrk/midnight-js-protocol`
// package types, but was never exercised end-to-end against a real compiled
// contract in this sandbox (no GitHub access to run the Compact compiler —
// see docs/DECISIONS.md). Treat this file as the top candidate for a small
// fix during the first real `npm run compile:contracts && npm run build`.
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import {
  deployContract,
  findDeployedContract,
  getPublicStates,
  type ContractProviders
} from '@midnight-ntwrk/midnight-js-contracts';
import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import { BallotContract, ballotWitnesses, type BallotPrivateState } from '@midnight-ballot/contracts';

const BALLOT_CONTRACT_TAG = 'midnight-ballot:ballot';

/**
 * Binds the compiled ballot.compact contract to its witness implementations.
 * `CompiledContract.make`'s generic `Ctor<C>` parameter is inferred from the
 * real compactc-generated `Contract` class, which this sandbox cannot
 * produce (no GitHub access to run the compiler — see docs/DECISIONS.md).
 * The `as never` here unblocks typechecking the rest of this file against a
 * hand-written stub that approximates but doesn't perfectly structurally
 * match the real generated types; re-verify this one call with `tsc` right
 * after the first real `npm run compile:contracts`.
 */
export function compiledBallotContract() {
  return CompiledContract.make(BALLOT_CONTRACT_TAG, BallotContract.Contract as never).pipe(
    CompiledContract.withWitnesses(ballotWitnesses as never)
  );
}

export interface DeployBallotArgs {
  readonly organizerKeyCommitment: Uint8Array;
  readonly pollIdSeed: Uint8Array;
  readonly initialOptionCount: bigint;
}

/** Deploys a fresh poll. Organizer-side only (needs organizerSecretKey in privateState). */
export async function deployBallot(
  providers: ContractProviders,
  privateStateId: string,
  initialPrivateState: BallotPrivateState,
  args: DeployBallotArgs
) {
  return deployContract(providers, {
    compiledContract: compiledBallotContract(),
    privateStateId,
    initialPrivateState,
    args: [args.organizerKeyCommitment, args.pollIdSeed, args.initialOptionCount]
    // `as never`: deployContract's generic `C`/args tuple type is inferred
    // from `compiledContract`, which this sandbox can't compile (see the
    // file-level note above) — cast avoids a false type error here while
    // keeping the *values* passed correct per docs/CONTRACT_SPEC.md's
    // constructor signature. Remove the cast once compiled locally and let
    // real inference check it.
  } as never);
}

/** Connects to an already-deployed poll at `contractAddress`. */
export async function connectBallot(
  providers: ContractProviders,
  contractAddress: string,
  privateStateId: string,
  initialPrivateState: BallotPrivateState
) {
  return findDeployedContract(providers, {
    compiledContract: compiledBallotContract(),
    contractAddress,
    privateStateId,
    initialPrivateState
    // See the `as never` note in deployBallot above — same reason.
  } as never);
}

/** Public-only read of a poll's ledger state — no wallet/private state needed. */
export async function readBallotPublicState(publicDataProvider: PublicDataProvider, contractAddress: string) {
  const { contractState } = await getPublicStates(publicDataProvider, contractAddress);
  return BallotContract.ledger(contractState.data);
}
