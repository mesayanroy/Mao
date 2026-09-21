import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary';

export function Button({
  variant = 'primary',
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base: React.CSSProperties = {
    font: 'inherit',
    fontWeight: 600,
    padding: '10px 20px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    opacity: props.disabled ? 0.5 : 1,
    background: variant === 'primary' ? 'var(--fg)' : 'var(--bg)',
    color: variant === 'primary' ? 'var(--bg)' : 'var(--fg)'
  };
  return <button {...props} style={{ ...base, ...style }} />;
}
