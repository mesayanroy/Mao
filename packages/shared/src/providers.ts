// Node-side provider factories. Used by packages/server (read-only: only
// createIndexerProvider) and by scripts/*.ts organizer CLI tooling (the
// full bundle — those run on the organizer's own machine, so touching
// private state there does not violate the server privacy invariant in
// docs/THREAT_MODEL.md). Never import createLocalProvingProviders from
// packages/server.
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import type { PublicDataProvider, ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types';
// indexerPublicDataProvider's webSocketImpl param is typed against
// `isomorphic-ws` specifically (confirmed by reading the package's own
// .d.ts — it imports `* as ws from 'isomorphic-ws'`), not the plain `ws`
// package, even though isomorphic-ws re-exports `ws` under Node.
import * as isomorphicWs from 'isomorphic-ws';
import type { NetworkEndpoints } from './config.js';

/** Read-only public chain data — safe for the server, which never proves or holds secrets. */
export function createIndexerProvider(endpoints: NetworkEndpoints): PublicDataProvider {
  return indexerPublicDataProvider(endpoints.indexerUrl, endpoints.indexerWsUrl, isomorphicWs.WebSocket);
}

export interface LocalProvingProvidersConfig {
  readonly endpoints: NetworkEndpoints;
  readonly zkArtifactsDir: string;
  readonly privateStoragePasswordProvider: () => Promise<string> | string;
  readonly accountId: string;
}

/**
 * Full local-proving provider bundle for organizer CLI scripts
 * (scripts/deploy-contract.ts, register-voter.ts, ...). These run on the
 * organizer's own machine against a local proof server — never on the
 * shared server process.
 */
export function createLocalProvingProviders(config: LocalProvingProvidersConfig) {
  const zkConfigProvider: ZKConfigProvider<string> = new NodeZkConfigProvider(config.zkArtifactsDir);
  return {
    publicDataProvider: createIndexerProvider(config.endpoints),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.endpoints.proofServerUrl, zkConfigProvider),
    privateStateProvider: levelPrivateStateProvider({
      privateStoragePasswordProvider: config.privateStoragePasswordProvider,
      accountId: config.accountId
    })
  };
}
