import { useEffect, useState, useCallback } from 'react';
import type { PollMetadata, PollTally } from '@maao/shared';
import { api } from '../lib/api';

export interface PollData {
  readonly poll: PollMetadata | null;
  readonly tally: PollTally | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => void;
}

/** Polls the server every `intervalMs` for live phase/tally — no wallet needed. */
export function usePoll(pollId: string | undefined, intervalMs = 4000): PollData {
  const [poll, setPoll] = useState<PollMetadata | null>(null);
  const [tally, setTally] = useState<PollTally | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!pollId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([api.getPoll(pollId), api.getTally(pollId)])
      .then(([p, t]) => {
        if (cancelled) return;
        setPoll(p);
        setTally(t);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'failed to load poll');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pollId, tick]);

  useEffect(() => {
    if (!pollId) return undefined;
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [pollId, intervalMs, refresh]);

  return { poll, tally, loading, error, refresh };
}
