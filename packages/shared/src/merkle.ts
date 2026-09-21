// Client-side Merkle path construction. Rebuilds the same depth-10 tree the
// contract's `voters` HistoricMerkleTree maintains, from the PUBLIC
// commitment list served by GET /api/v1/polls/:id/commitments (see
// docs/API.md), so a voter's wallet can produce a valid MerkleTreePath
// witness entirely locally — no on-chain read of a private path, and no
// server involvement. Grounded in the real @midnight-ntwrk/compact-runtime
// / onchain-runtime types — see docs/DECISIONS.md.
import {
  CompactTypeBytes,
  CompactTypeField,
  CompactTypeMerkleTreePath,
  StateBoundedMerkleTree,
  type AlignedValue,
  type MerkleTreePath
} from '@midnight-ntwrk/compact-runtime';

export const VOTER_TREE_DEPTH = 10;

const bytes32 = new CompactTypeBytes(32);
const pathType = new CompactTypeMerkleTreePath<Uint8Array>(VOTER_TREE_DEPTH, bytes32);

const toAligned = (leaf: Uint8Array): AlignedValue => ({
  value: bytes32.toValue(leaf),
  alignment: bytes32.alignment()
});

const bytesEqual = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((byte, i) => byte === b[i]);

/**
 * Builds a MerkleTreePath proving `commitment`'s membership, given the full
 * ordered list of commitments currently registered on-chain. Throws if
 * `commitment` isn't present in the list.
 */
export function buildVoterPath(
  commitments: readonly Uint8Array[],
  commitment: Uint8Array
): MerkleTreePath<Uint8Array> {
  const index = commitments.findIndex((c) => bytesEqual(c, commitment));
  if (index === -1) {
    throw new Error('commitment is not in the registered voter list — are you registered yet?');
  }

  let tree = new StateBoundedMerkleTree(VOTER_TREE_DEPTH);
  commitments.forEach((c, i) => {
    tree = tree.update(BigInt(i), toAligned(c));
  });
  tree = tree.rehash();

  const pathValue = tree.pathForLeaf(BigInt(index), toAligned(commitment));
  return pathType.fromValue(pathValue.value);
}

/**
 * Recomputes the tree root as a hex-encoded field element, for display /
 * public-verifiability purposes (GET /api/v1/polls/:id/tally's
 * `merkleRoot`). Independent of the generated Ledger type's own `voters`
 * accessor (see docs/DECISIONS.md) — rebuilds from the same public
 * commitment list the client uses for paths, so it's always consistent with
 * what `buildVoterPath` sees.
 */
export function computeVotersRoot(commitments: readonly Uint8Array[]): string {
  let tree = new StateBoundedMerkleTree(VOTER_TREE_DEPTH);
  commitments.forEach((c, i) => {
    tree = tree.update(BigInt(i), toAligned(c));
  });
  tree = tree.rehash();
  const root = tree.root();
  if (!root) {
    return '';
  }
  return CompactTypeField.fromValue(root.value).toString(16);
}
