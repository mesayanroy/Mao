#!/usr/bin/env -S tsx
// Organizer-run: records a deployed poll's public metadata with the server.
// Usage: npm run create:poll -- --title "..." --options Yes,No --address <hex>
import 'dotenv/config';

function arg(name: string): string | undefined {
  const args = process.argv.slice(2);
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

async function main(): Promise<void> {
  const title = arg('title');
  const options = (arg('options') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const contractAddress = arg('address');
  if (!title || options.length < 2 || !contractAddress) {
    throw new Error('usage: --title "..." --options Yes,No[,...] --address <contract-address-hex>');
  }

  const apiBase = process.env.API_BASE_URL ?? 'http://localhost:8080/api/v1';
  const res = await fetch(`${apiBase}/polls`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, options, contractAddress })
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`server rejected poll creation: ${JSON.stringify(body)}`);
  }
  console.log('Poll registered:', body.data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
