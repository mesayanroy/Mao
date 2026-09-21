import { Notice } from './Notice';

export type TxState = 'idle' | 'proving' | 'pending' | 'success' | 'error';

export function TxStatus({ state, message }: { state: TxState; message?: string }) {
  if (state === 'idle') return null;
  const text: Record<Exclude<TxState, 'idle'>, string> = {
    proving: 'Generating proof locally — this can take a while, please keep this tab open…',
    pending: 'Transaction submitted, waiting for confirmation…',
    success: 'Confirmed.',
    error: message ?? 'Something went wrong.'
  };
  return <Notice tone={state === 'error' ? 'danger' : 'default'}>{text[state]}</Notice>;
}
