// DUST fee sponsorship. Operates ONLY on an already-finalized, user-proven
// transaction; never sees voter secrets, witnesses, or private state — see
// docs/THREAT_MODEL.md "Sponsor (DUST) abuse".
import type * as ledger from '@midnight-ntwrk/ledger-v8';
import type { SponsorWallet } from './facade.js';

/**
 * Adds DUST fee inputs to `finalizedTx` and submits it. `tokenKindsToBalance:
 * ['dust']` (confirmed real option on WalletFacade.balanceFinalizedTransaction
 * — see docs/DECISIONS.md) ensures only fee inputs are added; the caller's
 * already-proven circuit inputs are untouched.
 */
export async function sponsorTransaction(wallet: SponsorWallet, finalizedTx: ledger.FinalizedTransaction): Promise<string> {
  const ttl = new Date(Date.now() + 30 * 60 * 1000);
  const recipe = await wallet.facade.balanceFinalizedTransaction(
    finalizedTx,
    { shieldedSecretKeys: wallet.shieldedSecretKeys, dustSecretKey: wallet.dustSecretKey },
    { ttl, tokenKindsToBalance: ['dust'] }
  );
  const balancedTx = await wallet.facade.finalizeRecipe(recipe);
  return wallet.facade.submitTransaction(balancedTx);
}
