import type { PropsWithChildren } from 'react';

export function Field({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ marginBottom: 'var(--space-1)', fontWeight: 600 }}>{label}</div>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        font: 'inherit',
        padding: '8px 10px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: 'var(--bg)',
        color: 'var(--fg)'
      }}
    />
  );
}
