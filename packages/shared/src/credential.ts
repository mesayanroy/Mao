// Voter/organizer credential generation. Runs ONLY client-side (browser
// wallet) or in an organizer's own local CLI run — see
// docs/WALLET_INTEGRATION.md and docs/THREAT_MODEL.md. Never import this
// module from packages/server.
import { BallotContract } from '@maao/contracts';

export interface Credential {
  /** NEVER leaves the local device — store only in encrypted local state. */
  readonly secret: Uint8Array;
  /** Safe to share: a hiding hash of `secret`. This is what gets registered on-chain. */
  readonly commitment: Uint8Array;
}

/** Generates a fresh random 32-byte secret and its public commitment. */
export function generateCredential(): Credential {
  const secret = new Uint8Array(32);
  crypto.getRandomValues(secret);
  return { secret, commitment: commitmentFromSecret(secret) };
}

export function commitmentFromSecret(secret: Uint8Array): Uint8Array {
  return BallotContract.pureCircuits.commitmentFor(secret);
}

export function organizerKeyFromSecret(secretKey: Uint8Array): Uint8Array {
  return BallotContract.pureCircuits.organizerKeyFor(secretKey);
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error('hex string must have an even length');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
