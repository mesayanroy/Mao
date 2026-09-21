import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PollMetadata } from '@midnight-ballot/shared';
import { api } from '../lib/api';
import { usePoll } from '../hooks/usePoll';
import { Card } from '../components/Card';
import { Notice } from '../components/Notice';

export function Results() {
  const [params, setParams] = useSearchParams();
  const pollId = params.get('id') ?? undefined;
  const [polls, setPolls] = useState<PollMetadata[]>([]);

  useEffect(() => {
    api.listPolls().then(setPolls).catch(() => setPolls([]));
  }, []);

  const { poll, tally, loading, error } = usePoll(pollId);

  return (
    <div className="stack">
      <h1>Results</h1>
      <p>Public data only — no wallet needed. Anyone can verify these numbers independently.</p>

      {!pollId && (
        <Card>
          <h2>Choose a poll</h2>
          {polls.length === 0 ? (
            <Notice>No polls yet.</Notice>
          ) : (
            <ul>
              {polls.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setParams({ id: p.id })}
                    style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}
                  >
                    {p.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {pollId && loading && <Notice>Loading…</Notice>}
      {pollId && error && <Notice tone="danger">{error}</Notice>}

      {pollId && poll && tally && (
        <Card>
          <h2>{poll.title}</h2>
          <p>Phase: {tally.phase}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {poll.options.map((label, i) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '6px 0' }}>{label}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700 }}>{tally.tally[i] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: 'var(--space-3)' }}>
            Total votes: {tally.totalVotes} — nullifier count: {tally.nullifierCount} —{' '}
            {tally.totalVotes === tally.nullifierCount ? 'consistent' : 'MISMATCH'}
          </p>
          <p style={{ color: 'var(--muted)', wordBreak: 'break-all' }}>Merkle root: {tally.merkleRoot}</p>
        </Card>
      )}
    </div>
  );
}
