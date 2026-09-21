// Thin client for the server's read-only API — see docs/API.md. Never
// sends a voter secret; only public data (poll metadata, commitments).
import type { PollMetadata, PollTally, PollCommitments, ServerConfig, ApiResult } from '@midnight-ballot/shared';
import { clientConfig } from './config';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${clientConfig.apiBaseUrl}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init
  });
  const body = (await res.json()) as ApiResult<T>;
  if ('error' in body) {
    throw new Error(`${body.error.code}: ${body.error.message}`);
  }
  return body.data;
}

export const api = {
  getConfig: () => request<ServerConfig>('/config'),
  listPolls: () => request<PollMetadata[]>('/polls'),
  getPoll: (id: string) => request<PollMetadata>(`/polls/${id}`),
  createPoll: (body: { title: string; options: string[]; contractAddress: string }) =>
    request<{ id: string }>('/polls', { method: 'POST', body: JSON.stringify(body) }),
  getTally: (id: string) => request<PollTally>(`/polls/${id}/tally`),
  getCommitments: (id: string) => request<PollCommitments>(`/polls/${id}/commitments`)
};
