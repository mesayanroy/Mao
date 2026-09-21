import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createBallotPrivateState } from '@midnight-ballot/contracts';
import { generateCredential, bytesToHex, type PollMetadata } from '@midnight-ballot/shared';
import { useWallet } from '../hooks/useWallet';
import { useBallot } from '../hooks/useBallot';
import { WalletStatus } from '../components/WalletStatus';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { TxStatus, type TxState } from '../components/TxStatus';
import { api } from '../lib/api';
import { saveCredential, loadCredential } from '../lib/storage';

export function Vote() {
  const [params, setParams] = useSearchParams();
  const pollId = params.get('id') ?? undefined;
  const [polls, setPolls] = useState<PollMetadata[]>([]);
  const [poll, setPoll] = useState<PollMetadata | null>(null);
  const [credential, setCredential] = useState<ReturnType<typeof generateCredential> | null>(null);
  const [selectedOption, setSelectedOption] = useState(0);
  const [tx, setTx] = useState<TxState>('idle');
  const [error, setError] = useState<string | null>(null);

  const { status, connect } = useWallet();
  const walletApi = status.state === 'connected' ? status.api : null;
  const { castVote } = useBallot(walletApi);

  useEffect(() => {
    api.listPolls().then(setPolls).catch(() => setPolls([]));
  }, []);

  useEffect(() => {
    if (!pollId) return;
    api.getPoll(pollId).then(setPoll).catch((err) => setError(err.message));
    const existing = loadCredential(pollId);
    setCredential(existing ?? null);
  }, [pollId]);

  function handleGenerateCredential(): void {
    if (!pollId) return;
    const cred = generateCredential();
    saveCredential(pollId, cred);
    setCredential(cred);
  }

  async function handleCastVote(): Promise<void> {
    if (!pollId || !credential) return;
    setError(null);
    setTx('proving');
    try {
      await castVote(
        // contract address comes from poll metadata
        poll?.contractAddress ?? '',
        pollId,
        createBallotPrivateState(credential.secret),
        BigInt(selectedOption)
      );
      setTx('success');
    } catch (err) {
      setTx('error');
      setError(err instanceof Error ? err.message : 'vote failed');
    }
  }

  return (
    <div className="stack">
      <h1>Vote</h1>
      <WalletStatus status={status} onConnect={connect} />

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

      {pollId && poll && (
        <Card>
          <h2>{poll.title}</h2>
          <p>Phase: {poll.phase}</p>

          {!credential && (
            <div className="stack">
              <Notice>
                Generate a private credential to vote in this poll. Your secret never leaves this
                browser — only its public commitment does, and only after you send it to the
                organizer yourself.
              </Notice>
              <Button onClick={handleGenerateCredential}>Generate credential</Button>
            </div>
          )}

          {credential && (
            <div className="stack">
              <Notice>
                Send this commitment to the organizer to get registered (out-of-band, e.g. email
                or chat):
                <br />
                <code style={{ wordBreak: 'break-all' }}>{bytesToHex(credential.commitment)}</code>
              </Notice>

              {poll.phase === 'Voting' && (
                <div className="stack">
                  <div className="row">
                    {poll.options.map((label, i) => (
                      <label key={label} className="row" style={{ gap: 'var(--space-1)' }}>
                        <input
                          type="radio"
                          name="option"
                          checked={selectedOption === i}
                          onChange={() => setSelectedOption(i)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <Button onClick={handleCastVote} disabled={status.state !== 'connected' || tx === 'proving' || tx === 'pending'}>
                    Cast vote
                  </Button>
                </div>
              )}
              {poll.phase !== 'Voting' && <Notice>Voting is not currently open for this poll.</Notice>}
            </div>
          )}
        </Card>
      )}

      <TxStatus state={tx} message={error ?? undefined} />
    </div>
  );
}
