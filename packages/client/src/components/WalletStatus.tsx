import type { WalletStatus as WalletStatusType } from '../hooks/useWallet';
import { WalletPicker } from './WalletPicker';
import { Notice } from './Notice';

export function WalletStatus({ status, onConnect }: { status: WalletStatusType; onConnect: (id: string) => void }) {
  switch (status.state) {
    case 'no-wallet':
      return <WalletPicker wallets={[]} onSelect={onConnect} />;
    case 'idle':
      return <WalletPicker wallets={status.wallets} onSelect={onConnect} />;
    case 'connecting':
      return <Notice>Connecting…</Notice>;
    case 'wrong-network':
      return (
        <Notice tone="danger">
          Wallet is on network &quot;{status.actual}&quot; but this app expects &quot;{status.expected}&quot;.
          Switch networks in your wallet.
        </Notice>
      );
    case 'error':
      return <Notice tone="danger">{status.message}</Notice>;
    case 'connected':
      return (
        <div className="row-between">
          <span>
            {status.wallet.name} — {status.address.slice(0, 12)}…
          </span>
          <span>DUST: {status.dustBalance.toString()}</span>
        </div>
      );
    default:
      return null;
  }
}
