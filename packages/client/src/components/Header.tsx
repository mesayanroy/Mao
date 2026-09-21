import { Link, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/organizer', label: 'Organizer' },
  { to: '/vote', label: 'Vote' },
  { to: '/results', label: 'Results' }
];

export function Header() {
  const location = useLocation();
  return (
    <header style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="container row-between">
        <Link to="/" style={{ fontWeight: 700, textDecoration: 'none' }}>
          Midnight Ballot
        </Link>
        <nav className="row">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                textDecoration: 'none',
                fontWeight: location.pathname === link.to ? 700 : 400,
                borderBottom: location.pathname === link.to ? '2px solid var(--fg)' : '2px solid transparent',
                paddingBottom: 2
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
