import type { PropsWithChildren } from 'react';

export function Card({ children }: PropsWithChildren) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 'var(--space-4)' }}>
      {children}
    </div>
  );
}
