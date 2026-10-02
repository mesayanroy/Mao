import { useState } from 'react';
import { randomBytes as cryptoRandomBytes } from '../lib/random';
import { createBallotPrivateState } from '@maao/contracts';
import { organizerKeyFromSecret, hexToBytes } from '@maao/shared';
import { useWallet } from '../hooks/useWallet';
import { useBallot } from '../hooks/useBallot';
import { WalletStatus } from '../components/WalletStatus';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { TxStatus, type TxState } from '../components/TxStatus';
import { api } from '../lib/api';
import { saveOrganizerSecret, loadOrganizerSecret } from '../lib/storage';

export function Organizer() {
  const { status, connect } = useWallet();
  const walletApi = status.state === 'connected' ? status.api : null;
  const { deployPoll, registerVoter, openVoting, closeVoting } = useBallot(walletApi);

  const [title, setTitle] = useState('');
  const [optionsText, setOptionsText] = useState('Yes, No');
  const [poll, setPoll] = useState<{ id: string; contractAddress: string } | null>(null);
  const [commitmentInput, setCommitmentInput] = useState('');
  const [tx, setTx] = useState<TxState>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleDeploy(): Promise<void> {
    const options = optionsText.split(',').map((s) => s.trim()).filter(Boolean);
    if (options.length < 2 || options.length > 4) {
      setError('Provide 2 to 4 comma-separated options.');
      return;
    }
    setError(null);
    setTx('proving');
    try {
      const tempId = crypto.randomUUID();
      const organizerSecret = cryptoRandomBytes(32);
      const privateState = createBallotPrivateState(organizerSecret);
      const contractAddress = await deployPoll(tempId, privateState, {
        organizerKeyCommitment: organizerKeyFromSecret(organizerSecret),
        pollIdSeed: cryptoRandomBytes(32),
        initialOptionCount: BigInt(options.length)
      });
      setTx('pending');
      const created = await api.createPoll({ title, options, contractAddress });
      saveOrganizerSecret(created.id, organizerSecret);
      setPoll({ id: created.id, contractAddress });
      setTx('success');
    } catch (err) {
      setTx('error');
      setError(err instanceof Error ? err.message : 'deploy failed');
    }
  }

  async function withOrganizer(action: (secret: Uint8Array) => Promise<void>): Promise<void> {
    if (!poll) return;
    const secret = loadOrganizerSecret(poll.id);
    if (!secret) {
      setError('Organizer credential not found in this browser.');
      return;
    }
    setTx('pending');
    setError(null);
    try {
      await action(secret);
      setTx('success');
    } catch (err) {
      setTx('error');
      setError(err instanceof Error ? err.message : 'action failed');
    }
  }

  return (
    <div className="max-w-[900px] mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Poll Organizer Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Deploy ballot contracts to Midnight, allowlist voter commitment hashes, and control voting lifecycle phases.
        </p>
      </div>

      <WalletStatus status={status} onConnect={connect} />

      {!poll && (
        <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-6">
          <div className="border-b border-border/40 pb-4">
            <h2 className="text-2xl font-display font-bold">Create New Poll</h2>
            <p className="text-xs text-muted-foreground mt-1">Configure poll parameters and deploy the Compact smart contract.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Poll Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q3 Governance Protocol Upgrade"
                className="w-full h-11 px-4 rounded-xl bg-secondary/40 border border-border/60 focus:border-foreground text-foreground text-sm outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Options (2 to 4, comma-separated)</label>
              <input
                type="text"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Yes, No, Abstain"
                className="w-full h-11 px-4 rounded-xl bg-secondary/40 border border-border/60 focus:border-foreground text-foreground text-sm outline-none transition-all font-mono text-xs"
              />
            </div>

            <Button
              onClick={handleDeploy}
              disabled={status.state !== 'connected' || !title || tx === 'proving' || tx === 'pending'}
              className="w-full rounded-full h-12 text-base bg-foreground hover:bg-foreground/90 text-background font-semibold"
            >
              {tx === 'proving' ? 'Proving Organizer Setup...' : tx === 'pending' ? 'Deploying to Midnight...' : 'Deploy Ballot Contract'}
            </Button>
          </div>
        </div>
      )}

      {poll && (
        <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-6">
          <div className="border-b border-border/40 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold">Manage Poll #{poll.id}</h2>
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Active Contract
              </span>
            </div>
            <code className="block mt-2 p-2 rounded bg-secondary/50 font-mono text-xs text-muted-foreground select-all break-all border border-border/40">
              {poll.contractAddress}
            </code>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Register Voter Commitment</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={commitmentInput}
                  onChange={(e) => setCommitmentInput(e.target.value)}
                  placeholder="Paste hex commitment sent by voter..."
                  className="flex-1 h-11 px-4 rounded-xl bg-secondary/40 border border-border/60 focus:border-foreground text-foreground text-xs font-mono outline-none transition-all"
                />
                <Button
                  variant="secondary"
                  disabled={!commitmentInput}
                  onClick={() =>
                    withOrganizer((secret) =>
                      registerVoter(poll.contractAddress, poll.id, createBallotPrivateState(secret), hexToBytes(commitmentInput))
                    )
                  }
                  className="rounded-xl px-5 h-11 font-medium text-xs border border-border"
                >
                  Register Commitment
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border/40 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Poll Phase Control</div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => withOrganizer((secret) => openVoting(poll.contractAddress, poll.id, createBallotPrivateState(secret)))}
                  className="rounded-full px-6 h-10 text-xs font-medium border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-400"
                >
                  Open Voting Phase
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => withOrganizer((secret) => closeVoting(poll.contractAddress, poll.id, createBallotPrivateState(secret)))}
                  className="rounded-full px-6 h-10 text-xs font-medium border-rose-500/40 hover:bg-rose-500/10 text-rose-400"
                >
                  Close Poll Tally
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TxStatus state={tx} message={error ?? undefined} />
      {error && tx !== 'error' && <Notice tone="danger">{error}</Notice>}
    </div>
  );
}
