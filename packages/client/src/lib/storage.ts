// Local-only voter credential storage. Secrets NEVER leave this browser —
// see docs/THREAT_MODEL.md. localStorage is adequate for the MVP demo; a
// production build should use the wallet's own encrypted private-state
// storage instead (packages/shared/src/providers.ts's private state
// provider pattern, adapted for a browser IndexedDB backend).
import { bytesToHex, hexToBytes, type Credential } from '@maao/shared';

function keyFor(pollId: string): string {
  return `maao:credential:${pollId}`;
}

export function saveCredential(pollId: string, credential: Credential): void {
  localStorage.setItem(
    keyFor(pollId),
    JSON.stringify({ secret: bytesToHex(credential.secret), commitment: bytesToHex(credential.commitment) })
  );
}

export function loadCredential(pollId: string): Credential | null {
  const raw = localStorage.getItem(keyFor(pollId));
  if (!raw) return null;
  const parsed = JSON.parse(raw) as { secret: string; commitment: string };
  return { secret: hexToBytes(parsed.secret), commitment: hexToBytes(parsed.commitment) };
}

function organizerKeyStorageKey(pollId: string): string {
  return `maao:organizer-key:${pollId}`;
}

export function saveOrganizerSecret(pollId: string, secretKey: Uint8Array): void {
  localStorage.setItem(organizerKeyStorageKey(pollId), bytesToHex(secretKey));
}

export function loadOrganizerSecret(pollId: string): Uint8Array | null {
  const raw = localStorage.getItem(organizerKeyStorageKey(pollId));
  return raw ? hexToBytes(raw) : null;
}
