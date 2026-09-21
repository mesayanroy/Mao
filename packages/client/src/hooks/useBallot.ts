// Browser-side contract interaction: builds Midnight.js providers around the
// connected wallet so proving happens in the wallet, never here or on the
// server. See docs/WALLET_INTEGRATION.md and docs/ARCHITECTURE.md.
//
// NOTE: wiring `walletProvider`/`midnightProvider` from the DApp Connector's
// `ConnectedAPI` onto the `ContractProviders` bundle mirrors the documented
// connector pattern (docs/DECISIONS.md) but — like ballot-client.ts — was
// not exercised against a real compiled contract in this sandbox. Treat as
// best-effort scaffolding to verify first.
import { useMemo } from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type BallotPrivateState } from '@midnight-ballot/contracts';
import { resolveNetwork, connectBallot, deployBallot, buildVoterPath, commitmentFromSecret, hexToBytes } from '@midnight-ballot/shared';
import { clientConfig } from '../lib/config';
import { api } from '../lib/api';

export function useBallot(walletApi: ConnectedAPI | null) {
  const endpoints = useMemo(() => resolveNetwork(clientConfig.networkId), []);

  const providers = useMemo(() => {
    if (!walletApi) return null;
    const zkConfigProvider = new FetchZkConfigProvider(clientConfig.zkConfigUrl);
    return {
      publicDataProvider: indexerPublicDataProvider(endpoints.indexerUrl, endpoints.indexerWsUrl),
      zkConfigProvider,
      privateStateProvider: levelPrivateStateProvider({
        privateStoragePasswordProvider: () => 'midnight-ballot-local',
        accountId: 'browser'
      }),
      // costModel isn't available client-side ahead of a real transaction;
      // see the file-level note above — verify against a real wallet build.
      proofProvider: dappConnectorProofProvider(walletApi, zkConfigProvider, undefined as never),
      walletProvider: walletApi as never,
      midnightProvider: walletApi as never
    };
  }, [walletApi, endpoints]);

  async function castVote(
    contractAddress: string,
    pollId: string,
    privateState: BallotPrivateState,
    option: bigint
  ): Promise<void> {
    if (!providers) throw new Error('wallet not connected');
    const commitmentsResponse = await api.getCommitments(pollId);
    const commitments = commitmentsResponse.commitments.map(hexToBytes);
    const commitment = commitmentFromSecret(privateState.secretKey);
    const path = buildVoterPath(commitments, commitment);

    const contract = await connectBallot(providers as never, contractAddress, `ballot-${pollId}`, privateState);
    await contract.callTx.castVote!(option, path); // non-null: see file header note
  }

  /** Organizer-only: deploys a fresh poll. Returns the new contract address. */
  async function deployPoll(
    pollId: string,
    privateState: BallotPrivateState,
    args: { organizerKeyCommitment: Uint8Array; pollIdSeed: Uint8Array; initialOptionCount: bigint }
  ): Promise<string> {
    if (!providers) throw new Error('wallet not connected');
    const deployed = await deployBallot(providers as never, `ballot-${pollId}`, privateState, args);
    return deployed.deployTxData.public.contractAddress;
  }

  /** Organizer-only: adds a voter's commitment to the allowlist. */
  async function registerVoter(
    contractAddress: string,
    pollId: string,
    privateState: BallotPrivateState,
    commitment: Uint8Array
  ): Promise<void> {
    if (!providers) throw new Error('wallet not connected');
    const contract = await connectBallot(providers as never, contractAddress, `ballot-${pollId}`, privateState);
    await contract.callTx.registerVoter!(commitment); // non-null: see file header note
  }

  /** Organizer-only: freezes registration and opens voting. */
  async function openVoting(contractAddress: string, pollId: string, privateState: BallotPrivateState): Promise<void> {
    if (!providers) throw new Error('wallet not connected');
    const contract = await connectBallot(providers as never, contractAddress, `ballot-${pollId}`, privateState);
    await contract.callTx.openVoting!(); // non-null: see file header note
  }

  /** Organizer-only: closes voting and finalizes tallies. */
  async function closeVoting(contractAddress: string, pollId: string, privateState: BallotPrivateState): Promise<void> {
    if (!providers) throw new Error('wallet not connected');
    const contract = await connectBallot(providers as never, contractAddress, `ballot-${pollId}`, privateState);
    await contract.callTx.closeVoting!(); // non-null: see file header note
  }

  return { providers, castVote, deployPoll, registerVoter, openVoting, closeVoting };
}
