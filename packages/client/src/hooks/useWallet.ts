// DApp Connector integration. Enumerates window.midnight.* — never
// hardcodes a single wallet name, so any wallet exposing the connector API
// (Lace = 'mnLace', 1AM, etc.) works. Types come directly from the official
// @midnight-ntwrk/dapp-connector-api package (which also declares the
// window.midnight global itself — see docs/DECISIONS.md), not hand-rolled
// approximations. See docs/WALLET_INTEGRATION.md.
import { useCallback, useEffect, useState } from 'react';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { clientConfig } from '../lib/config';

export interface WalletInfo {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly apiVersion: string;
}

export type WalletStatus =
  | { state: 'no-wallet' }
  | { state: 'idle'; wallets: WalletInfo[] }
  | { state: 'connecting' }
  | { state: 'wrong-network'; expected: string; actual: string }
  | { state: 'connected'; wallet: WalletInfo; api: ConnectedAPI; dustBalance: bigint; address: string }
  | { state: 'error'; message: string };

export function useWallet() {
  const [status, setStatus] = useState<WalletStatus>({ state: 'no-wallet' });

  useEffect(() => {
    const wallets = enumerateWallets();
    setStatus(wallets.length > 0 ? { state: 'idle', wallets } : { state: 'no-wallet' });
  }, []);

  const connect = useCallback(async (walletId: string) => {
    const handle = window.midnight?.[walletId];
    if (!handle) {
      setStatus({ state: 'error', message: `wallet "${walletId}" is not available` });
      return;
    }
    setStatus({ state: 'connecting' });
    try {
      const api = await handle.connect(clientConfig.networkId);
      const connectionStatus = await api.getConnectionStatus();
      if (connectionStatus.status !== 'connected' || connectionStatus.networkId !== clientConfig.networkId) {
        setStatus({
          state: 'wrong-network',
          expected: clientConfig.networkId,
          actual: connectionStatus.status === 'connected' ? connectionStatus.networkId : 'disconnected'
        });
        return;
      }
      const [dust, { unshieldedAddress }] = await Promise.all([api.getDustBalance(), api.getUnshieldedAddress()]);
      setStatus({
        state: 'connected',
        wallet: { id: walletId, name: handle.name, icon: handle.icon, apiVersion: handle.apiVersion },
        api,
        dustBalance: dust.balance,
        address: unshieldedAddress
      });
    } catch (err) {
      setStatus({ state: 'error', message: err instanceof Error ? err.message : 'failed to connect' });
    }
  }, []);

  return { status, connect };
}

function enumerateWallets(): WalletInfo[] {
  if (typeof window === 'undefined' || !window.midnight) return [];
  return Object.entries(window.midnight).map(([id, handle]: [string, InitialAPI]) => ({
    id,
    name: handle.name,
    icon: handle.icon,
    apiVersion: handle.apiVersion
  }));
}
