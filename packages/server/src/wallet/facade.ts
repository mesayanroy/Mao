// Headless WalletFacade composition for the sponsor wallet. WalletFacade's
// own API (init/stop/balanceFinalizedTransaction/submitTransaction) was
// confirmed by downloading the real @midnightntwrk/wallet-sdk-facade
// package (see docs/DECISIONS.md). The sub-wallet factory calls below
// (ShieldedWallet/UnshieldedWallet/DustWallet/createKeystore/PublicKey)
// follow the pattern documented at
// docs.midnight.network/sdks/official/wallet-developer-guide but were not
// re-verified against each sub-package's own shipped types in this
// session — flagged in docs/DECISIONS.md as the second candidate (after
// ballot-client.ts) to double-check first if sponsorship misbehaves.
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { WalletFacade, type DefaultConfiguration } from '@midnightntwrk/wallet-sdk-facade';
import { ShieldedWallet } from '@midnightntwrk/wallet-sdk-shielded';
import { DustWallet } from '@midnightntwrk/wallet-sdk-dust-wallet';
import { UnshieldedWallet, createKeystore, PublicKey } from '@midnightntwrk/wallet-sdk-unshielded-wallet';
import type { NetworkEndpoints } from '@maao/shared';
import { deriveSponsorKeys } from './keys.js';

export interface SponsorWallet {
  readonly facade: WalletFacade;
  readonly shieldedSecretKeys: ledger.ZswapSecretKeys;
  readonly dustSecretKey: ledger.DustSecretKey;
  stop(): Promise<void>;
}

/**
 * Initializes the sponsor wallet from its seed. Runs once at server boot
 * (only when SPONSOR_ENABLED=true) and is stopped on graceful shutdown —
 * see src/index.ts.
 */
export async function initSponsorWallet(seed: Uint8Array, endpoints: NetworkEndpoints): Promise<SponsorWallet> {
  const keys = deriveSponsorKeys(seed);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys.shielded.key);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys.dust.key);
  const unshieldedKeystore = createKeystore(keys.unshielded.key, endpoints.networkId);

  const configuration: DefaultConfiguration = {
    networkId: endpoints.networkId,
    relayURL: new URL(endpoints.nodeUrl),
    provingServerUrl: new URL(endpoints.proofServerUrl),
    indexerClientConnection: {
      indexerHttpUrl: endpoints.indexerUrl,
      indexerWsUrl: endpoints.indexerWsUrl
    }
  } as DefaultConfiguration;

  const facade = await WalletFacade.init({
    configuration,
    shielded: (config) => ShieldedWallet(config).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (config) => UnshieldedWallet(config).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (config) => DustWallet(config).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust)
  });
  await facade.start(shieldedSecretKeys, dustSecretKey);

  return {
    facade,
    shieldedSecretKeys,
    dustSecretKey,
    stop: () => facade.stop()
  };
}
