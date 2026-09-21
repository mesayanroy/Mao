import { mnemonicToSeedSync } from 'bip39';
import { configureNetwork, createIndexerProvider, resolveNetwork } from '@midnight-ballot/shared';
import { loadEnv } from './env.js';
import { createLogger } from './logger.js';
import { buildApp } from './app.js';
import { FileStore } from './store/file-store.js';
import { IndexerService } from './services/indexer.service.js';
import { PollService } from './services/poll.service.js';
import { SponsorService } from './services/sponsor.service.js';
import { initSponsorWallet, type SponsorWallet } from './wallet/facade.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env);

  configureNetwork(env.NETWORK_ID);
  const endpoints = resolveNetwork(env.NETWORK_ID, {
    nodeUrl: env.NODE_URL,
    indexerUrl: env.INDEXER_URL,
    indexerWsUrl: env.INDEXER_WS_URL,
    proofServerUrl: env.PROOF_SERVER_URL
  });

  const indexer = new IndexerService(createIndexerProvider(endpoints));
  const repository = new FileStore(env.DATA_DIR);
  const polls = new PollService(repository, indexer);

  let sponsorWallet: SponsorWallet | undefined;
  let sponsor: SponsorService | undefined;
  if (env.SPONSOR_ENABLED) {
    logger.info('DUST sponsorship enabled — starting sponsor wallet');
    sponsorWallet = await initSponsorWallet(mnemonicToSeedSync(env.SPONSOR_WALLET_SEED), endpoints);
    sponsor = new SponsorService(sponsorWallet);
  }

  const app = await buildApp({ env, logger, indexer, polls, sponsor });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    await app.close();
    if (sponsorWallet) await sponsorWallet.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  logger.info({ port: env.PORT, networkId: env.NETWORK_ID }, 'midnight-ballot server listening');
}

main().catch((err) => {
  // eslint-disable-next-line no-console -- logger may not exist yet if env parsing itself failed
  console.error('fatal startup error:', err);
  process.exit(1);
});
