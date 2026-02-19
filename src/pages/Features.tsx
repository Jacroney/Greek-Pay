import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ArrowPathIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const heroFeature = {
  title: 'Executive Control Center',
  subtitle: 'A single command center for dues, cash, and accountability.',
  bullets: [
    'Real‑time cash position and burn rate',
    'Upcoming dues + recurring alerts',
    'Analytics that explain what changed and why'
  ],
  cta: 'See Dashboard in Action'
};

const coreFeatures = [
  {
    title: 'Transactions',
    subtitle: 'Every transaction, automatically organized.',
    bullets: ['Bank + manual activity in one ledger', 'Inline categorization', 'Permanent audit trail'],
    icon: ClipboardDocumentCheckIcon,
    tone: 'text-blue-700 border-blue-200 bg-blue-50',
    cta: 'Explore Transactions'
  },
  {
    title: 'Budgets',
    subtitle: 'Plan once, track live, adjust fast.',
    bullets: ['Live vs. budgeted tracking', 'Category rollups', 'Early variance alerts'],
    icon: CurrencyDollarIcon,
    tone: 'text-emerald-700 border-emerald-200 bg-emerald-50',
    cta: 'View Budgets'
  },
  {
    title: 'Members & Dues',
    subtitle: 'Automated dues collection that pays on time.',
    bullets: ['Smart dues schedules + reminders', 'Member portal with payment history', 'Late fees and status tracking'],
    icon: UserGroupIcon,
    tone: 'text-amber-700 border-amber-200 bg-amber-50',
    cta: 'Manage Members'
  },
  {
    title: 'Reports',
    subtitle: 'Board‑ready analysis without the spreadsheet work.',
    bullets: ['PDF & CSV exports', 'Dues collection performance', 'Budget and cash trend views'],
    icon: ArrowTrendingUpIcon,
    tone: 'text-violet-700 border-violet-200 bg-violet-50',
    cta: 'See Reports'
  }
];

const highlightFeature = {
  title: 'AI Financial Advisor',
  subtitle: 'Instant answers. Smarter decisions.',
  description:
    'Ask questions about budgets, dues, and cash health to get clear explanations, trends, and next steps.',
  cta: 'Ask the AI',
  icon: SparklesIcon
};

const utilityFeatures = [
  {
    title: 'Recurring',
    subtitle: 'Predictable cash flow.',
    bullets: ['Automated posting', 'Forecasted impact', 'Easy adjustments'],
    icon: ArrowPathIcon
  },
  {
    title: 'Bank Sync',
    subtitle: 'Always‑current books.',
    bullets: ['Plaid‑powered connections', 'Continuous reconciliation', 'Fewer manual errors'],
    icon: BanknotesIcon
  },
  {
    title: 'Security',
    subtitle: 'Trustworthy by default.',
    bullets: ['Role‑based access', 'Audit‑ready logs', 'Secure by design'],
    icon: Cog6ToothIcon
  }
];

const sellingPoints = [
  {
    title: 'Automated dues collection',
    description: 'Schedules, reminders, and payment status run on autopilot.'
  },
  {
    title: 'Data‑driven decisions',
    description: 'Trends, variances, and cash health are visible instantly.'
  },
  {
    title: 'Faster board reporting',
    description: 'PDF/CSV outputs are ready in minutes, not weekends.'
  },
  {
    title: 'Less admin overhead',
    description: 'Bank sync + workflows replace spreadsheet upkeep.'
  }
];

const Features: React.FC = () => {
  const navigate = useNavigate();
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setIsHeaderScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--brand-surface)] text-slate-900">
      <header
        className={`sticky top-0 z-50 transition-colors duration-200 ${
          isHeaderScrolled
            ? 'border-b border-[var(--brand-border)] bg-white/90 backdrop-blur'
            : 'border-b border-transparent bg-white'
        }`}
      >
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link to="/" className="-ml-36 flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl shadow-sm overflow-hidden">
              <img
                src="/GreekPay-logo-white.png"
                alt="GreekPay Logo"
                className="h-full w-full object-cover"
              />
            </span>
            <span className="text-xl font-semibold tracking-tight text-slate-950">Greek Pay</span>
          </Link>
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-sm font-medium text-slate-700 sm:flex scale-[1.3] origin-center">
            <Link to="/features" className="text-[var(--brand-primary)]">Features</Link>
            <Link to="/pricing" className="transition-colors hover:text-[var(--brand-primary)]">Pricing</Link>
            <Link to="/demo" className="transition-colors hover:text-[var(--brand-primary)]">Demo</Link>
            <Link to="/contact" className="transition-colors hover:text-[var(--brand-primary)]">Contact</Link>
          </nav>
          <div className="absolute -right-28 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="rounded-full bg-[var(--brand-primary)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
            >
              Sign in
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-[var(--brand-border)] bg-gradient-to-b from-[#ffffff] via-[#f1f5f9] to-[var(--brand-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
              <div>
                <span className="inline-flex items-center rounded-full border border-[var(--brand-border)] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Product Features
                </span>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Built for modern treasurers, not spreadsheets.
                </h1>
                <p className="mt-4 text-lg text-slate-600">
                  GreekPay unifies dues, budgets, bank sync, reporting, and members in one workspace—replacing
                  spreadsheets and scattered tools with real‑time clarity.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate('/demo')}
                    className="rounded-full bg-[var(--brand-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                  >
                    Launch interactive demo
                  </button>
                  <button
                    onClick={() => navigate('/contact')}
                    className="rounded-full border border-[var(--brand-border)] bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                  >
                    Talk to sales
                  </button>
                </div>
              </div>
              <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {heroFeature.title}
                  </p>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Up to date
                  </span>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Available funds</p>
                    <p className="mt-2 text-2xl font-semibold" style={{ color: '#0b1120' }}>
                      $48,320
                    </p>
                    <p className="text-xs text-slate-500">+12.4% vs last quarter</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs text-slate-500">Dues collected</p>
                      <p className="mt-1 text-sm font-semibold" style={{ color: '#0b1120' }}>
                        88%
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs text-slate-500">Budget health</p>
                      <p className="mt-1 text-sm font-semibold" style={{ color: '#0b1120' }}>
                        On track
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-6 text-sm text-slate-600">{heroFeature.subtitle}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {heroFeature.bullets.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/demo')}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)]"
                >
                  {heroFeature.cta} →
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--brand-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-semibold text-slate-950">
                  The complete GreekPay toolkit
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Purpose‑built modules for treasurers, execs, and alumni oversight.
                </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {coreFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group rounded-3xl border border-[var(--brand-border)] bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-[var(--brand-primary)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${feature.tone} transition-colors group-hover:brightness-105`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <h2 className="mt-4 text-xl font-semibold" style={{ color: '#0b1120' }}>
                      {feature.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">{feature.subtitle}</p>
                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      {feature.bullets.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <button className="mt-4 inline-flex items-center text-sm font-semibold text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-primary-dark)]">
                      {feature.cta} →
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-10 rounded-3xl border border-[var(--brand-border)] bg-gradient-to-br from-[#EEF2FF] via-white to-white p-8 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--brand-primary)] shadow-sm">
                      <highlightFeature.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold" style={{ color: '#0b1120' }}>
                        {highlightFeature.title}
                      </h2>
                      <p className="text-sm text-slate-600">{highlightFeature.subtitle}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-600">{highlightFeature.description}</p>
                </div>
                <button
                  onClick={() => navigate('/demo')}
                  className="rounded-full bg-[var(--brand-primary)] px-5 py-2 text-sm font-semibold text-white shadow-sm"
                >
                  {highlightFeature.cta}
                </button>
              </div>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {utilityFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-3xl border border-[var(--brand-border)] bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[var(--brand-primary)]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold" style={{ color: '#0b1120' }}>
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">{feature.subtitle}</p>
                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      {feature.bullets.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold" style={{ color: '#0b1120' }}>
                    Why GreekPay wins
                  </h2>
                  <p className="text-sm text-slate-600">
                    Built for fraternity finance workflows—not generic small‑business software or spreadsheets.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/demo')}
                  className="rounded-full bg-[var(--brand-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  See it live
                </button>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {sellingPoints.map((point) => (
                  <div key={point.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold" style={{ color: '#0b1120' }}>
                      {point.title}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{point.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Compared to generic finance tools</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    GreekPay is built for dues cycles, member rosters, and chapter governance—not SMB accounting.
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    You get the exact workflows fraternities need without unnecessary complexity.
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Compared to Google Sheets</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    Automated dues, live bank sync, and instant reporting replace manual entry and version chaos.
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Less risk, fewer errors, and real accountability for boards and members.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Features;
