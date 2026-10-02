import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useWallet } from '../hooks/useWallet';
import { ShieldCheck, Vote, Settings, BarChart3, Wallet, Sparkles, Workflow, Lock, Rocket } from 'lucide-react';

const LINKS = [
  { to: '/', label: 'Home', icon: ShieldCheck },
  { to: '/vote', label: 'Vote', icon: Vote },
  { to: '/organizer', label: 'Organizer', icon: Settings },
  { to: '/results', label: 'Results', icon: BarChart3 }
];

// In-page sections on Home; clicking one smooth-scrolls to it (navigating home first if needed).
const SECTIONS = [
  { id: 'live-app', label: 'Live App', icon: Rocket },
  { id: 'features', label: 'Features', icon: Sparkles },
  { id: 'how-it-works', label: 'How it works', icon: Workflow },
  { id: 'security', label: 'Security', icon: Lock }
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { status, connect } = useWallet();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollToSection(id: string) {
    const go = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (location.pathname === '/') {
      go();
    } else {
      navigate('/');
      setTimeout(go, 80);
    }
  }

  return (
    <header
      className={`sticky z-50 transition-all duration-500 ${isScrolled ? 'top-3 px-3 lg:px-6' : 'top-0 px-0'}`}
    >
      <div
        className={`mx-auto transition-all duration-500 ${
          isScrolled
            ? 'max-w-[1200px] rounded-2xl border border-foreground/10 bg-background/80 shadow-lg backdrop-blur-xl'
            : 'max-w-[1400px] border-b border-border/40 bg-background/80 backdrop-blur-md'
        }`}
      >
        <div
          className={`flex items-center justify-between gap-4 px-4 lg:px-8 transition-all duration-500 ${
            isScrolled ? 'h-14' : 'h-16'
          }`}
        >
          <Link to="/" className="flex shrink-0 items-center gap-2 group">
            <img
              src="/maao-logo.png"
              alt="Maao logo"
              className={`object-contain transition-all duration-500 ${isScrolled ? 'h-7 w-9' : 'h-9 w-12'}`}
            />
            <span className={`font-display tracking-tight font-semibold transition-all duration-500 ${isScrolled ? 'text-lg' : 'text-xl'}`}>
              Maao
            </span>
            <span className="hidden sm:inline text-[10px] font-mono uppercase bg-secondary px-2 py-0.5 rounded text-muted-foreground border border-border/50">
              ZK Voting
            </span>
          </Link>

          {/* Horizontally scrollable on narrow screens; pages + in-page feature sections. */}
          <nav className="flex min-w-0 flex-1 justify-start md:justify-center">
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap bg-secondary/50 p-1.5 rounded-full border border-border/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {LINKS.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex shrink-0 items-center gap-2 px-3 lg:px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-background text-foreground shadow-xs border border-border/50'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {link.label}
                  </Link>
                );
              })}
              <span className="mx-1 h-4 w-px shrink-0 bg-border" />
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className="flex shrink-0 items-center gap-2 px-3 lg:px-4 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/60 transition-all duration-200"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            {status.state === 'connected' ? (
              <div className="flex items-center gap-2 bg-secondary/80 border border-border px-3 py-1.5 rounded-full text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Connected
              </div>
            ) : (
              <Button
                onClick={() => {
                  const defaultWallet = status.state === 'idle' && status.wallets[0] ? status.wallets[0].id : 'mnLace';
                  connect(defaultWallet);
                }}
                size="sm"
                variant="outline"
                className="rounded-full h-9 px-4 text-xs font-medium gap-2 border-foreground/20 hover:bg-foreground/10"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Connect Wallet</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
