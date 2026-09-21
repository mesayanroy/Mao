import pino from 'pino';
import type { Env } from './env.js';

/**
 * Structured logger. Never pass voter secrets, witnesses, or Merkle paths to
 * this — see docs/THREAT_MODEL.md. Redacts common accidental-leak paths as
 * defense in depth.
 */
export function createLogger(env: Pick<Env, 'LOG_LEVEL'>) {
  return pino({
    level: env.LOG_LEVEL,
    redact: {
      paths: ['*.secret', '*.secretKey', '*.witness', '*.merklePath', '*.privateState'],
      censor: '[redacted]'
    },
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
  });
}

export type Logger = ReturnType<typeof createLogger>;
