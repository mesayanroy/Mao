// Server environment, validated once at boot. See docs/DEPLOYMENT.md for
// the full variable reference and .env.example for defaults.
import { z } from 'zod';
import { isNetworkId } from '@maao/shared';

const envSchema = z.object({
  NETWORK_ID: z.string().refine(isNetworkId, 'must be undeployed|preview|preprod|mainnet'),
  NODE_URL: z.string().url().optional(),
  INDEXER_URL: z.string().url().optional(),
  INDEXER_WS_URL: z.string().optional(),
  PROOF_SERVER_URL: z.string().url().optional(),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ALLOWED_ORIGINS: z.string().default(''),
  DATA_DIR: z.string().default('./data'),
  ZK_CONFIG_URL: z.string().default(''),
  SPONSOR_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  SPONSOR_WALLET_SEED: z.string().default(''),
  SPONSOR_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10)
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  if (parsed.data.SPONSOR_ENABLED && parsed.data.SPONSOR_WALLET_SEED.trim() === '') {
    throw new Error('SPONSOR_ENABLED=true requires SPONSOR_WALLET_SEED to be set');
  }
  return parsed.data;
}
