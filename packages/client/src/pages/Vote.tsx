import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createBallotPrivateState } from '@maao/contracts';
import { generateCredential, bytesToHex, type PollMetadata } from '@maao/shared';
import { useWallet } from '../hooks/useWallet';
import { useBallot } from '../hooks/useBallot';
import { WalletStatus } from '../components/WalletStatus';
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
    <div className="max-w-[800px] mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Cast Your Vote</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate a zero-knowledge voter credential and submit an anonymous vote to the Maao smart contract.
        </p>
      </div>

      <WalletStatus status={status} onConnect={connect} />

      {!pollId && (
        <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-display font-semibold">Select an Active Poll</h2>
          {polls.length === 0 ? (
            <Notice>No polls registered yet. Check back soon or create one in the Organizer dashboard.</Notice>
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

      {pollId && poll && (
        <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <h2 className="text-2xl font-display font-bold">{poll.title}</h2>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">Contract: {poll.contractAddress}</div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
              poll.phase === 'Voting'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-muted text-muted-foreground border border-border'
            }`}>
              Phase: {poll.phase}
            </span>
          </div>

          {!credential && (
            <div className="space-y-4">
              <Notice>
                Generate a private voter credential. Your voter secret stays 100% inside this browser — only its public commitment is shared with the organizer to get allowlisted.
              </Notice>
              <Button onClick={handleGenerateCredential} className="rounded-full px-6">
                Generate Voter Credential
              </Button>
            </div>
          )}

          {credential && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Public Commitment (Share with Organizer):</div>
                <code className="block p-3 rounded-lg bg-background border border-border font-mono text-xs text-foreground select-all break-all">
                  {bytesToHex(credential.commitment)}
                </code>
              </div>

              {poll.phase === 'Voting' && (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-foreground">Select Ballot Option:</div>
                  <div className="grid gap-3">
                    {poll.options.map((label, i) => (
                      <label
                        key={label}
                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedOption === i
                            ? 'bg-foreground text-background border-foreground font-medium'
                            : 'bg-secondary/30 border-border/50 text-foreground hover:bg-secondary/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name="option"
                          checked={selectedOption === i}
                          onChange={() => setSelectedOption(i)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedOption === i ? 'border-background bg-background' : 'border-muted-foreground'
                        }`}>
                          {selectedOption === i && <div className="w-2 h-2 rounded-full bg-foreground" />}
                        </div>
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>

                  <Button
                    onClick={handleCastVote}
                    disabled={status.state !== 'connected' || tx === 'proving' || tx === 'pending'}
                    className="w-full rounded-full h-12 text-base bg-foreground hover:bg-foreground/90 text-background font-semibold"
                  >
                    {tx === 'proving' ? 'Generating ZK Proof...' : tx === 'pending' ? 'Submitting to Midnight...' : 'Cast Anonymous Vote'}
                  </Button>
                </div>
              )}

              {poll.phase !== 'Voting' && (
                <Notice>Voting is not currently open for this poll (Current phase: {poll.phase}).</Notice>
              )}
            </div>
          )}
        </div>
      )}

      <TxStatus state={tx} message={error ?? undefined} />
    </div>
  );
}
