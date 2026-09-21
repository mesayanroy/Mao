import { Transaction, type FinalizedTransaction } from '@midnight-ntwrk/ledger-v8';
import type { SponsorWallet } from '../wallet/facade.js';
import { sponsorTransaction } from '../wallet/dust.js';

export class SponsorService {
  constructor(private readonly wallet: SponsorWallet) {}

  async sponsor(finalizedTxHex: string): Promise<{ txId: string }> {
    // `FinalizedTransaction` is `Transaction<SignatureEnabled, Proof, Binding>`;
    // deserialize needs each phantom type's literal marker, confirmed by
    // reading the real installed ledger-v8 .d.ts (see docs/DECISIONS.md).
    const finalizedTx = Transaction.deserialize(
      'signature',
      'proof',
      'binding',
      Buffer.from(finalizedTxHex, 'hex')
    ) as FinalizedTransaction;
    const txId = await sponsorTransaction(this.wallet, finalizedTx);
    return { txId };
  }
}
