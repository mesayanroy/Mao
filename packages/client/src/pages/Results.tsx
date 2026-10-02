import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PollMetadata } from '@maao/shared';
import { api } from '../lib/api';
import { usePoll } from '../hooks/usePoll';
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
    <div className="max-w-[850px] mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Public Vote Tallies</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Publicly verifiable, tamper-proof tallies directly read from Midnight Network indexers. No wallet required.
        </p>
      </div>

      {!pollId && (
        <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-display font-semibold">Select Poll to Inspect</h2>
          {polls.length === 0 ? (
            <Notice>No polls registered yet.</Notice>
          ) : (
            <div className="grid gap-3">
              {polls.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setParams({ id: p.id })}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/70 hover:border-foreground/30 transition-all text-left group"
                >
                  <div>
                    <div className="font-medium text-foreground">{p.title}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">ID: {p.id}</div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium uppercase bg-background border border-border text-foreground">
                    {p.phase}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {pollId && loading && <Notice>Loading on-chain state...</Notice>}
      {pollId && error && <Notice tone="danger">{error}</Notice>}

      {pollId && poll && tally && (
        <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <h2 className="text-2xl font-display font-bold">{poll.title}</h2>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">ID: {poll.id}</div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-secondary text-foreground border border-border">
              Phase: {tally.phase}
            </span>
          </div>

          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tally Breakdown</div>
            <div className="space-y-4">
              {poll.options.map((label, i) => {
                const count = tally.tally[i] ?? 0;
                const percentage = tally.totalVotes > 0 ? Math.round((count / tally.totalVotes) * 100) : 0;
                return (
                  <div key={label} className="space-y-1.5 p-3 rounded-xl bg-secondary/30 border border-border/40">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{label}</span>
                      <span className="font-mono font-bold">{count} votes ({percentage}%)</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-foreground transition-all duration-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
              <div className="text-xs text-muted-foreground">Total Verified Votes</div>
              <div className="text-2xl font-display font-bold text-foreground mt-1">{tally.totalVotes}</div>
              <div className="text-[11px] text-muted-foreground font-mono mt-1">Nullifiers: {tally.nullifierCount}</div>
            </div>

            <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
              <div className="text-xs text-muted-foreground">Proof Consistency Check</div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                  tally.totalVotes === tally.nullifierCount
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  {tally.totalVotes === tally.nullifierCount ? 'Consistent' : 'Mismatch Warning'}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">1 Nullifier per unique voter proof</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historic Merkle Tree Root Hash</div>
            <code className="block font-mono text-xs text-foreground select-all break-all">
              {tally.merkleRoot}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
