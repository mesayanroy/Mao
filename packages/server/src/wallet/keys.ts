// HD key derivation for the sponsor wallet, using the real confirmed
// @midnightntwrk/wallet-sdk-hd API (see docs/DECISIONS.md). The sponsor
// wallet only ever adds DUST fee inputs to an already-proven transaction —
// it never touches voter secrets (docs/THREAT_MODEL.md).
import { HDWallet, Roles, type Role } from '@midnightntwrk/wallet-sdk-hd';

export interface DerivedRoleKey {
  readonly key: Uint8Array;
  readonly index: number;
}

/** Derives the first usable key at `role`, retrying the index on out-of-bounds results. */
function deriveRoleKey(hdWallet: HDWallet, account: number, role: Role, startIndex = 0): DerivedRoleKey {
  const accountKey = hdWallet.selectAccount(account);
  for (let index = startIndex; index < startIndex + 16; index += 1) {
    const result = accountKey.selectRole(role).deriveKeyAt(index);
    if (result.type === 'keyDerived') {
      return { key: result.key, index };
    }
  }
  throw new Error(`could not derive a usable key for role ${role} within 16 attempts`);
}

export interface SponsorKeys {
  readonly unshielded: DerivedRoleKey;
  readonly dust: DerivedRoleKey;
  readonly shielded: DerivedRoleKey;
}

/** Derives the sponsor wallet's three role keys from its BIP39 seed. Call once at boot. */
export function deriveSponsorKeys(seed: Uint8Array, account = 0): SponsorKeys {
  const result = HDWallet.fromSeed(seed);
  if (result.type !== 'seedOk') {
    throw new Error('invalid sponsor wallet seed');
  }
  try {
    return {
      unshielded: deriveRoleKey(result.hdWallet, account, Roles.NightExternal),
      dust: deriveRoleKey(result.hdWallet, account, Roles.Dust),
      shielded: deriveRoleKey(result.hdWallet, account, Roles.Zswap)
    };
  } finally {
    result.hdWallet.clear();
  }
}
