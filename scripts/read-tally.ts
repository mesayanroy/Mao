#!/usr/bin/env -S tsx
// Anyone can run this — public read, no wallet needed.
// Usage: npm run read:tally -- --id <poll-id>
import 'dotenv/config';

function arg(name: string): string | undefined {
  const args = process.argv.slice(2);
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

async function main(): Promise<void> {
  const id = arg('id');
  if (!id) throw new Error('usage: --id <poll-id>');

  const apiBase = process.env.API_BASE_URL ?? 'http://localhost:8080/api/v1';
  const res = await fetch(`${apiBase}/polls/${id}/tally`);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`failed to read tally: ${JSON.stringify(body)}`);
  }
  const { tally, totalVotes, nullifierCount, merkleRoot, phase } = body.data;
  console.log(`Poll ${id} (${phase})`);
  console.log('Tally:', tally);
  console.log(
    `Total votes: ${totalVotes} — nullifier count: ${nullifierCount} — ${
      totalVotes === nullifierCount ? 'CONSISTENT' : 'MISMATCH'
    }`
  );
  console.log('Merkle root:', merkleRoot);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
