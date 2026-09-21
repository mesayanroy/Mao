import { useState } from 'react';
import { randomBytes as cryptoRandomBytes } from '../lib/random';
import { createBallotPrivateState } from '@midnight-ballot/contracts';
import { organizerKeyFromSecret, hexToBytes } from '@midnight-ballot/shared';
import { useWallet } from '../hooks/useWallet';
import { useBallot } from '../hooks/useBallot';
import { WalletStatus } from '../components/WalletStatus';
import { Card } from '../components/Card';
import { Field, TextInput } from '../components/Field';
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
    <div className="stack">
      <h1>Organizer</h1>
      <WalletStatus status={status} onConnect={connect} />

      {!poll && (
        <Card>
          <h2>Create a poll</h2>
          <div className="stack">
            <Field label="Title">
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Approve Q3 budget" />
            </Field>
            <Field label="Options (2-4, comma-separated)">
              <TextInput value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
            </Field>
            <Button onClick={handleDeploy} disabled={status.state !== 'connected' || !title || tx === 'proving' || tx === 'pending'}>
              Deploy poll
            </Button>
          </div>
        </Card>
      )}

      {poll && (
        <Card>
          <h2>Manage poll</h2>
          <p style={{ wordBreak: 'break-all', color: 'var(--muted)' }}>Contract: {poll.contractAddress}</p>
          <div className="stack">
            <Field label="Voter commitment (paste what the voter sent you)">
              <TextInput value={commitmentInput} onChange={(e) => setCommitmentInput(e.target.value)} placeholder="hex commitment" />
            </Field>
            <div className="row">
              <Button
                variant="secondary"
                disabled={!commitmentInput}
                onClick={() =>
                  withOrganizer((secret) =>
                    registerVoter(poll.contractAddress, poll.id, createBallotPrivateState(secret), hexToBytes(commitmentInput))
                  )
                }
              >
                Register voter
              </Button>
              <Button variant="secondary" onClick={() => withOrganizer((secret) => openVoting(poll.contractAddress, poll.id, createBallotPrivateState(secret)))}>
                Open voting
              </Button>
              <Button variant="secondary" onClick={() => withOrganizer((secret) => closeVoting(poll.contractAddress, poll.id, createBallotPrivateState(secret)))}>
                Close voting
              </Button>
            </div>
          </div>
        </Card>
      )}

      <TxStatus state={tx} message={error ?? undefined} />
      {error && tx !== 'error' && <Notice tone="danger">{error}</Notice>}
    </div>
  );
}
