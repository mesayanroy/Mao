import { Link } from 'react-router-dom';
import { HeroSection } from '../components/landing/hero-section';
import { FeaturesSection } from '../components/landing/features-section';
import { HowItWorksSection } from '../components/landing/how-it-works-section';
import { SecuritySection } from '../components/landing/security-section';
import { FooterSection } from '../components/landing/footer-section';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Vote,
  Settings,
  BarChart3,
  ArrowRight,
  Timer,
  ListChecks,
  Fingerprint,
  Ban,
  KeyRound,
  GitBranch,
  Scale
} from 'lucide-react';

const ROLES = [
  {
    to: '/vote',
    icon: Vote,
    title: 'Cast Private Vote',
    description: 'Generate your private voter credential and cast an eligibility-proven vote securely.',
    cta: 'Go to Voting',
    variant: 'default' as const
  },
  {
    to: '/organizer',
    icon: Settings,
    title: 'Poll Organizer',
    description: 'Initialize polls, register voter commitments, and manage voting phase transitions.',
    cta: 'Organizer Dashboard',
    variant: 'outline' as const
  },
  {
    to: '/results',
    icon: BarChart3,
    title: 'Public Results',
    description: 'View live, tamper-proof tallies and state proof roots without needing a connected wallet.',
    cta: 'View Public Tally',
    variant: 'secondary' as const
  }
];

const QUICKSTART = [
  { title: 'Connect a Midnight wallet', detail: 'Lace (or any DApp-connector wallet) for the organizer; voters only need one to cast.' },
  { title: 'Deploy the poll contract', detail: 'Set a title and 2–4 options. The contract stores only a hash of your organizer key.' },
  { title: 'Allowlist voter commitments', detail: 'Voters generate a secret in-browser and share only its commitment hash; you register it.' },
  { title: 'Open, vote, close', detail: 'Open voting to freeze the allowlist, let voters cast, then close to finalize the tally.' }
];

// Each entry mirrors a check in packages/contracts/src/ballot.compact.
const GUARANTEES = [
  {
    icon: ListChecks,
    title: 'Merkle-tree allowlist',
    detail: 'Eligible voters live in a HistoricMerkleTree, so a membership proof made against an older root stays valid after later registrations.',
    code: 'voters: HistoricMerkleTree<10, Bytes<32>>'
  },
  {
    icon: Ban,
    title: 'One vote per credential',
    detail: 'Each vote publishes a nullifier. A second vote with the same secret hits the nullifier set and is rejected on-chain.',
    code: 'assert(!nullifiers.member(nullifier), "already voted")'
  },
  {
    icon: Fingerprint,
    title: 'Unlinkable across polls',
    detail: 'Nullifiers are domain-separated and bound to the poll ID, so the same voter secret cannot be tracked from one poll to the next.',
    code: 'nullifierFor(secret, pollId)'
  },
  {
    icon: KeyRound,
    title: 'Organizer-only controls',
    detail: 'Registering voters and changing phases require proving knowledge of the organizer secret; only its commitment is on-chain.',
    code: 'organizerKeyFor(organizerSecretKey()) == organizerKey'
  },
  {
    icon: GitBranch,
    title: 'Strict phase machine',
    detail: 'Registration → Voting → Closed. Opening voting freezes the allowlist; closing finalizes the tally. No skipping, no re-opening.',
    code: 'enum Phase { Registration, Voting, Closed }'
  },
  {
    icon: Scale,
    title: 'Publicly verifiable tally',
    detail: 'Up to four on-chain counters anyone can read. Check that total votes equal the nullifier count, no wallet needed.',
    code: 'tally0 + tally1 + tally2 + tally3 == nullifier count'
  }
];

export function Home() {
  return (
    <div className="relative overflow-x-hidden">
      {/* Hero Section */}
      <HeroSection />

      {/* Live App — role entry points + contract capabilities */}
      <section id="live-app" className="scroll-mt-24 bg-neutral-200/70 dark:bg-neutral-900 border-y border-border/60">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live App
            </span>
            <h2 className="text-3xl lg:text-4xl font-display tracking-tight mb-3">Launch Maao</h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm">
              Select your role to participate in ongoing private polls or configure new governance elections.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <Card key={role.to} className="bg-background/70 border-border/60 hover:border-foreground/40 transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center mb-2">
                      <Icon className="w-5 h-5 text-foreground" />
                    </div>
                    <CardTitle className="font-display text-xl">{role.title}</CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to={role.to}>
                      <Button variant={role.variant} className="w-full rounded-full gap-2 group">
                        {role.cta}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quickstart */}
          <div className="mt-6 rounded-xl border border-border/60 bg-background/70 p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-12">
              <div className="lg:w-1/3">
                <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center mb-3">
                  <Timer className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="font-display text-2xl tracking-tight mb-2">Get set up in about 5 minutes</h3>
                <p className="text-sm text-muted-foreground">
                  One contract per poll. The organizer deploys it, allowlists voters, and steps it through
                  Registration → Voting → Closed. No phase can be skipped or re-opened.
                </p>
              </div>
              <ol className="grid sm:grid-cols-2 gap-4 flex-1">
                {QUICKSTART.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-full border border-foreground/20 flex items-center justify-center text-xs font-mono">
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{step.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{step.detail}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Contract guarantees */}
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {GUARANTEES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-border/60 bg-background/70 p-6 hover:border-foreground/40 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-foreground/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-foreground" />
                    </div>
                    <h3 className="font-display text-lg tracking-tight">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.detail}</p>
                  <code className="mt-4 block text-[11px] font-mono text-muted-foreground/80 bg-secondary/60 rounded px-2 py-1 overflow-x-auto whitespace-nowrap">
                    {item.code}
                  </code>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <div id="features" className="scroll-mt-24">
        <FeaturesSection />
      </div>

      <div id="how-it-works" className="scroll-mt-24">
        <HowItWorksSection />
      </div>

      <div id="security" className="scroll-mt-24">
        <SecuritySection />
      </div>

      {/* Footer Section */}
      <FooterSection />
    </div>
  );
}
