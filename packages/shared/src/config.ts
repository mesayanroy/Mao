// Chain/network configuration. Single source of truth for every URL used
// anywhere in the repo — see docs/DECISIONS.md "Networks" for citations.
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

export type NetworkId = 'undeployed' | 'preview' | 'preprod' | 'mainnet';

export interface NetworkEndpoints {
  readonly networkId: NetworkId;
  readonly nodeUrl: string;
  readonly indexerUrl: string;
  readonly indexerWsUrl: string;
  readonly proofServerUrl: string;
}

const NETWORKS: Record<NetworkId, NetworkEndpoints> = {
  undeployed: {
    networkId: 'undeployed',
    nodeUrl: 'http://localhost:9944',
    indexerUrl: 'http://localhost:8088/api/v4/graphql',
    indexerWsUrl: 'ws://localhost:8088/api/v4/graphql/ws',
    proofServerUrl: 'http://localhost:6300'
  },
  preview: {
    networkId: 'preview',
    nodeUrl: 'https://rpc.preview.midnight.network',
    indexerUrl: 'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWsUrl: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    proofServerUrl: 'http://localhost:6300'
  },
  preprod: {
    networkId: 'preprod',
    nodeUrl: 'https://rpc.preprod.midnight.network',
    indexerUrl: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWsUrl: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    proofServerUrl: 'http://localhost:6300'
  },
  mainnet: {
    networkId: 'mainnet',
    nodeUrl: 'https://rpc.mainnet.midnight.network',
    indexerUrl: 'https://indexer.mainnet.midnight.network/api/v4/graphql',
    indexerWsUrl: 'wss://indexer.mainnet.midnight.network/api/v4/graphql/ws',
    proofServerUrl: 'http://localhost:6300'
  }
};

/**
 * Resolves the endpoints for a network, applying any explicit overrides
 * (e.g. from env vars) on top of the documented defaults.
 */
export function resolveNetwork(
  networkId: NetworkId,
  overrides: Partial<Omit<NetworkEndpoints, 'networkId'>> = {}
): NetworkEndpoints {
  return { ...NETWORKS[networkId], ...overrides };
}

/**
 * Configures the Midnight.js network id for this process. Must be called
 * once, before constructing any provider — `getNetworkId()` otherwise
 * throws (confirmed behavior, see docs/DECISIONS.md).
 */
export function configureNetwork(networkId: NetworkId): void {
  setNetworkId(networkId);
}

export function isNetworkId(value: string): value is NetworkId {
  return value === 'undeployed' || value === 'preview' || value === 'preprod' || value === 'mainnet';
}
