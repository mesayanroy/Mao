#!/usr/bin/env -S tsx
// Organizer-run: deploys a fresh ballot.compact instance. Runs entirely on
// the organizer's own machine — never on the server (docs/THREAT_MODEL.md).
//
// Usage: npm run deploy:contract -- --title "Approve budget" --options Yes,No,Abstain
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { configureNetwork, resolveNetwork, deployBallot, organizerKeyFromSecret, bytesToHex, isNetworkId } from '@maao/shared';
import { createLocalProvingProviders } from '@maao/shared/providers';
import { createBallotPrivateState } from '@maao/contracts';

function parseArgs(): { options: string[] } {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--options');
  const options = idx >= 0 ? (args[idx + 1] ?? '').split(',').map((s) => s.trim()) : ['Yes', 'No'];
  if (options.length < 2 || options.length > 4) {
    throw new Error('--options must list 2 to 4 comma-separated option labels');
  }
  return { options };
}

async function main(): Promise<void> {
  const networkId = process.env.NETWORK_ID ?? 'undeployed';
  if (!isNetworkId(networkId)) throw new Error(`invalid NETWORK_ID: ${networkId}`);
  configureNetwork(networkId);
  const endpoints = resolveNetwork(networkId, {
    nodeUrl: process.env.NODE_URL,
    indexerUrl: process.env.INDEXER_URL,
    indexerWsUrl: process.env.INDEXER_WS_URL,
    proofServerUrl: process.env.PROOF_SERVER_URL
  });

  const { options } = parseArgs();

  const organizerSecretKey = randomBytes(32);
  const pollIdSeed = randomBytes(32);
  console.log('Generated a fresh organizer secret key — save it if you want to reuse this');
  console.log('identity for another poll (never share it):', bytesToHex(organizerSecretKey));

  const providers = createLocalProvingProviders({
    endpoints,
    zkArtifactsDir: new URL('../packages/contracts/managed/ballot', import.meta.url).pathname,
    privateStoragePasswordProvider: () => process.env.ORGANIZER_STORAGE_PASSWORD ?? 'dev-only-password',
    accountId: 'organizer'
  });

  const deployed = await deployBallot(
    // @ts-expect-error -- createLocalProvingProviders' bundle lacks walletProvider/midnightProvider,
    // which a real deploy needs from a connected wallet; wire those in before running against a
    // funded network. See docs/DEPLOYMENT.md.
    providers,
    'ballot-organizer',
    createBallotPrivateState(organizerSecretKey),
    {
      organizerKeyCommitment: organizerKeyFromSecret(organizerSecretKey),
      pollIdSeed,
      initialOptionCount: BigInt(options.length)
    }
  );

  const contractAddress = deployed.deployTxData.public.contractAddress;
  console.log('\nDeployed. Contract address:');
  console.log(contractAddress);
  console.log('\nNext: npm run create:poll -- --title "..." --options', options.join(','), '--address', contractAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
