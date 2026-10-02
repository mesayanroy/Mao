// Public surface of @maao/contracts, consumed by
// packages/shared's ballot-client.ts. Re-exports the witnesses (safe: pure
// TypeScript, no compiled artifact needed) and the compactc-generated
// contract module (only resolvable after `npm run compile:contracts` — see
// managed/README.md).
export * from './witnesses.js';
// eslint-disable-next-line import/no-unresolved -- generated at compile time
export * as BallotContract from '../managed/ballot/contract/index.cjs';
