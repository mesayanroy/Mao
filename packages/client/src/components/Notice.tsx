import type { PropsWithChildren } from 'react';

type Tone = 'default' | 'danger';

export function Notice({ tone = 'default', children }: PropsWithChildren<{ tone?: Tone }>) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-2) var(--space-3)',
        background: tone === 'danger' ? 'var(--danger-bg)' : 'var(--bg)',
        color: tone === 'danger' ? 'var(--danger)' : 'var(--fg)'
      }}
    >
      {children}
    </div>
  );
}
