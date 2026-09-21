import type { WalletInfo } from '../hooks/useWallet';
import { Button } from './Button';
import { Notice } from './Notice';

export function WalletPicker({ wallets, onSelect }: { wallets: WalletInfo[]; onSelect: (id: string) => void }) {
  if (wallets.length === 0) {
    return (
      <Notice>
        No Midnight wallet detected. Install a wallet extension (e.g. Lace) that supports the
        Midnight DApp Connector, then reload this page.
      </Notice>
    );
  }
  return (
    <div className="row">
      {wallets.map((w) => (
        <Button key={w.id} variant="secondary" onClick={() => onSelect(w.id)}>
          Connect {w.name}
        </Button>
      ))}
    </div>
  );
}
