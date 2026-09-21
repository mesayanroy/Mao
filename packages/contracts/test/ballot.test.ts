import { describe, expect, it } from 'vitest';
import { BallotSimulator, Phase, pureCircuits } from './simulator.js';
import { buildMerklePath } from './merkle-helper.js';

const bytes32 = (seed: number): Uint8Array => {
  const b = new Uint8Array(32);
  b.fill(seed);
  return b;
};

const ORGANIZER_KEY = bytes32(1);
const POLL_ID = bytes32(2);
const VOTER_A = bytes32(10);
const VOTER_B = bytes32(11);
const NON_MEMBER = bytes32(99);

function commitmentOf(secret: Uint8Array): Uint8Array {
  return pureCircuits.commitmentFor(secret);
}

/** Deploys a poll, registers the given voter secrets, and opens voting. */
function setupOpenPoll(voterSecrets: Uint8Array[], optionCount = 3n) {
  const sim = new BallotSimulator(ORGANIZER_KEY, POLL_ID, optionCount);
  const commitments = voterSecrets.map(commitmentOf);
  for (const c of commitments) {
    sim.registerVoter(c);
  }
  sim.openVoting();
  return { sim, commitments };
}

describe('ballot.compact', () => {
  it('starts in Registration phase with zero tallies', () => {
    const sim = new BallotSimulator(ORGANIZER_KEY, POLL_ID, 3n);
    expect(sim.ledger.phase).toBe(Phase.Registration);
  });

  it('rejects registerVoter from a non-organizer', () => {
    const sim = new BallotSimulator(ORGANIZER_KEY, POLL_ID, 3n);
    sim.asCaller(bytes32(200));
    expect(() => sim.registerVoter(commitmentOf(VOTER_A))).toThrow();
  });

  it('rejects openVoting/closeVoting from a non-organizer', () => {
    const sim = new BallotSimulator(ORGANIZER_KEY, POLL_ID, 3n);
    sim.asCaller(bytes32(200));
    expect(() => sim.openVoting()).toThrow();
  });

  it('rejects registerVoter once voting has opened', () => {
    const { sim } = setupOpenPoll([VOTER_A]);
    expect(() => sim.registerVoter(commitmentOf(VOTER_B))).toThrow();
  });

  it('rejects castVote before voting opens', () => {
    const sim = new BallotSimulator(ORGANIZER_KEY, POLL_ID, 3n);
    const commitment = commitmentOf(VOTER_A);
    sim.registerVoter(commitment);
    const path = buildMerklePath([commitment], commitment);
    sim.asCaller(VOTER_A);
    expect(() => sim.castVote(0n, path)).toThrow();
  });

  it('accepts a valid vote and increments the matching tally', () => {
    const { sim, commitments } = setupOpenPoll([VOTER_A, VOTER_B]);
    const path = buildMerklePath(commitments, commitments[0]!);
    sim.asCaller(VOTER_A);
    sim.castVote(1n, path);

    expect(sim.ledger.tally0).toBe(0n);
    expect(sim.ledger.tally1).toBe(1n);
    expect(sim.ledger.tally2).toBe(0n);
    expect(sim.ledger.nullifiers.size()).toBe(1n);
  });

  it('rejects a non-member (not in the voters tree)', () => {
    const { sim, commitments } = setupOpenPoll([VOTER_A]);
    // Build a path for a leaf that was never registered.
    const path = buildMerklePath([...commitments, commitmentOf(NON_MEMBER)], commitmentOf(NON_MEMBER));
    sim.asCaller(NON_MEMBER);
    expect(() => sim.castVote(0n, path)).toThrow();
  });

  it('rejects reusing another member\'s path to vote as a different commitment (path-leaf binding)', () => {
    // Regression test for the exact bug class documented in docs/DECISIONS.md:
    // a path proving membership of commitment A must not authorize a vote
    // whose recomputed commitment is B, even though A is a genuine member.
    const { sim, commitments } = setupOpenPoll([VOTER_A, VOTER_B]);
    const pathForA = buildMerklePath(commitments, commitments[0]!);
    // VOTER_B calls castVote but supplies VOTER_A's path.
    sim.asCaller(VOTER_B);
    expect(() => sim.castVote(0n, pathForA)).toThrow();
  });

  it('blocks double voting: the same credential cannot vote twice', () => {
    const { sim, commitments } = setupOpenPoll([VOTER_A]);
    const path = buildMerklePath(commitments, commitments[0]!);
    sim.asCaller(VOTER_A);
    sim.castVote(0n, path);
    expect(() => sim.castVote(0n, path)).toThrow();
  });

  it('rejects an out-of-range option', () => {
    const { sim, commitments } = setupOpenPoll([VOTER_A], 2n);
    const path = buildMerklePath(commitments, commitments[0]!);
    sim.asCaller(VOTER_A);
    expect(() => sim.castVote(2n, path)).toThrow();
    expect(() => sim.castVote(3n, path)).toThrow();
  });

  it('rejects castVote after voting closes', () => {
    const { sim, commitments } = setupOpenPoll([VOTER_A]);
    sim.closeVoting();
    const path = buildMerklePath(commitments, commitments[0]!);
    sim.asCaller(VOTER_A);
    expect(() => sim.castVote(0n, path)).toThrow();
  });

  it('keeps sum(tallies) == nullifier count across many votes', () => {
    const voters = [bytes32(21), bytes32(22), bytes32(23), bytes32(24), bytes32(25)];
    const { sim, commitments } = setupOpenPoll(voters, 3n);
    const options = [0n, 1n, 1n, 2n, 0n];

    voters.forEach((voter, i) => {
      const path = buildMerklePath(commitments, commitments[i]!);
      sim.asCaller(voter);
      sim.castVote(options[i]!, path);
    });

    const total = sim.ledger.tally0 + sim.ledger.tally1 + sim.ledger.tally2 + sim.ledger.tally3;
    expect(total).toBe(BigInt(voters.length));
    expect(sim.ledger.nullifiers.size()).toBe(BigInt(voters.length));
  });
});
