#!/usr/bin/env -S tsx
// Organizer-run: registers a voter's commitment (received out-of-band from
// the voter) into the poll's on-chain allowlist. Runs on the organizer's
// own machine — never sees the voter's secret, only the public commitment
// they send. See docs/THREAT_MODEL.md.
//
// Usage: npm run register:voter -- --address <contract-address-hex> --commitment <hex> --organizer-key <hex>
import 'dotenv/config';
import { configureNetwork, resolveNetwork, connectBallot, hexToBytes, isNetworkId } from '@midnight-ballot/shared';
import { createLocalProvingProviders } from '@midnight-ballot/shared/providers';
import { createBallotPrivateState } from '@midnight-ballot/contracts';

function arg(name: string): string | undefined {
  const args = process.argv.slice(2);
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

async function main(): Promise<void> {
  const contractAddress = arg('address');
  const commitmentHex = arg('commitment');
  const organizerKeyHex = arg('organizer-key');
  if (!contractAddress || !commitmentHex || !organizerKeyHex) {
    throw new Error('usage: --address <hex> --commitment <hex> --organizer-key <hex>');
  }

  const networkId = process.env.NETWORK_ID ?? 'undeployed';
  if (!isNetworkId(networkId)) throw new Error(`invalid NETWORK_ID: ${networkId}`);
  configureNetwork(networkId);
  const endpoints = resolveNetwork(networkId, {
    nodeUrl: process.env.NODE_URL,
    indexerUrl: process.env.INDEXER_URL,
    indexerWsUrl: process.env.INDEXER_WS_URL,
    proofServerUrl: process.env.PROOF_SERVER_URL
  });

  const providers = createLocalProvingProviders({
    endpoints,
    zkArtifactsDir: new URL('../packages/contracts/managed/ballot', import.meta.url).pathname,
    privateStoragePasswordProvider: () => process.env.ORGANIZER_STORAGE_PASSWORD ?? 'dev-only-password',
    accountId: 'organizer'
  });

  const contract = await connectBallot(
    // @ts-expect-error -- see the same note in deploy-contract.ts: a real
    // registration transaction additionally needs a connected, funded
    // wallet's walletProvider/midnightProvider wired into `providers`.
    providers,
    contractAddress,
    'ballot-organizer',
    createBallotPrivateState(hexToBytes(organizerKeyHex))
  );

  await contract.callTx.registerVoter(hexToBytes(commitmentHex));
  console.log('Voter registered.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
