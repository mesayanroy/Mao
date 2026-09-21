// Test-only helper: builds a local HistoricMerkleTree-compatible Merkle tree
// from a list of Bytes<32> commitments and produces MerkleTreePath witnesses
// for castVote, mirroring what the client does in production (see
// packages/shared/src/merkle.ts) against the *public* commitment list — no
// on-chain read is involved, matching how a real voter's wallet builds its
// own path. Grounded in the confirmed real types from
// @midnight-ntwrk/compact-runtime and its onchain-runtime dependency (see
// docs/DECISIONS.md "Verified directly from installed npm packages").
import type { MerkleTreePath } from '@midnight-ntwrk/compact-runtime';
import {
  CompactTypeBytes,
  CompactTypeMerkleTreePath,
  StateBoundedMerkleTree,
  type AlignedValue
} from '@midnight-ntwrk/compact-runtime';

const TREE_HEIGHT = 10;
const bytes32 = new CompactTypeBytes(32);
const pathType = new CompactTypeMerkleTreePath<Uint8Array>(TREE_HEIGHT, bytes32);

const toAligned = (leaf: Uint8Array): AlignedValue => ({
  value: bytes32.toValue(leaf),
  alignment: bytes32.alignment()
});

/**
 * Builds a path for `leaf` given the full ordered list of commitments
 * currently registered on-chain (as returned by GET /polls/:id/commitments).
 * `leaf` must be present in `commitments`.
 */
export function buildMerklePath(commitments: readonly Uint8Array[], leaf: Uint8Array): MerkleTreePath<Uint8Array> {
  let tree = new StateBoundedMerkleTree(TREE_HEIGHT);
  commitments.forEach((commitment, index) => {
    tree = tree.update(BigInt(index), toAligned(commitment));
  });
  tree = tree.rehash();

  const index = commitments.findIndex((c) => bytesEqual(c, leaf));
  if (index === -1) {
    throw new Error('leaf is not a member of the given commitment list');
  }
  const pathValue = tree.pathForLeaf(BigInt(index), toAligned(leaf));
  return pathType.fromValue(pathValue.value);
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}
