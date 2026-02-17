import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const highlights = [
  'Role-based permissions so treasurers, execs, and members see exactly what they need.',
  'Budget planning tools that show allocation, spend, and forecasted runway at a glance.',
  'Audit-ready exports, PDF reporting, and CSV imports help you modernise operations fast.'
];

const includedFeatures = [
  'Unlimited bank account connections',
  'Automatic transaction syncing via Plaid',
  'Unlimited users and member accounts',
  'Budget tracking and management',
  'Member dues and payment tracking',
  'Recurring transaction automation',
  'Real-time financial dashboard',
  'PDF reports and CSV exports',
  'Role-based access control',
  'Email support and onboarding'
];

const Pricing: React.FC = () => {
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
      {/* Header */}
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
            <Link to="/features" className="transition-colors hover:text-[var(--brand-primary)]">Features</Link>
            <Link to="/pricing" className="text-[var(--brand-primary)]">Pricing</Link>
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

      {/* Main Content */}
      <main>
        <section className="border-b border-[var(--brand-border)] bg-gradient-to-b from-white via-[#eef2ff] to-[var(--brand-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <CurrencyDollarIcon className="h-4 w-4 text-[var(--brand-primary)]" />
                Pricing
              </span>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                One plan for every chapter.
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                Predictable, board‑friendly pricing with every tool included.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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

            <div className="mt-12 rounded-3xl border border-[var(--brand-border)] bg-white p-10 shadow-sm sm:p-12">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">GreekPay Standard</p>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-950">Everything included</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Budgeting, dues, reporting, automation, and AI insights in one subscription.
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                  All features included
                </div>
              </div>

              <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-semibold text-slate-950">$200</span>
                    <span className="text-lg text-slate-600">+ $10/member</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">per year</p>
                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <span className="text-sm font-medium text-slate-700">Annual chapter platform</span>
                      <span className="text-sm font-semibold text-slate-950">$200</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <span className="text-sm font-medium text-slate-700">Active member access</span>
                      <span className="text-sm font-semibold text-slate-950">$10 / member</span>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-6 min-h-[190px]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Small chapter</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">$700</p>
                    <p className="text-xs text-slate-500">50 members/year</p>
                    <p className="mt-2 text-xs text-slate-500">$200 + (50 × $10)</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--brand-primary)] bg-white p-6 min-h-[190px] shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-primary)]">Medium chapter</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">$1,200</p>
                    <p className="text-xs text-slate-500">100 members/year</p>
                    <p className="mt-2 text-xs text-slate-500">$200 + (100 × $10)</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-6 min-h-[190px]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Large chapter</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">$1,700</p>
                    <p className="text-xs text-slate-500">150 members/year</p>
                    <p className="mt-2 text-xs text-slate-500">$200 + (150 × $10)</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {['Bank sync', 'AI insights', 'Member billing', 'Reports', 'Budgets'].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[var(--brand-border)] bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--brand-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-8 shadow-sm sm:p-10">
              <div className="grid gap-8 lg:grid-cols-[1fr] lg:items-center">
                <div>
                  <h2 className="text-3xl font-semibold text-slate-950">Why GreekPay</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Purpose‑built tools that replace spreadsheets and make treasury work effortless.
                  </p>
                </div>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Automated dues</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Collect, track, and remind without manual follow‑ups</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Deep analysis</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Board‑ready insights on cash flow, budgets, and trends</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live bank sync</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Always‑up‑to‑date ledgers with Plaid reconciliation</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Audit‑ready reporting</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Exports and summaries built for execs and alumni boards</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr,1.1fr] lg:items-start">
              <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-6 shadow-sm lg:self-center">
                <h3 className="text-lg font-semibold text-slate-950">Why chapters choose GreekPay</h3>
                <ul className="mt-4 space-y-4 text-sm text-slate-700">
                  {highlights.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-3xl font-semibold text-slate-950">Everything included, no add‑ons.</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Every chapter gets access to the full suite: budgets, dues, reports, automations, and AI insights.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {includedFeatures.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-3 rounded-xl border border-[var(--brand-border)] bg-white p-4"
                    >
                      <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-emerald-500" />
                      <span className="text-sm font-medium text-slate-900">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--brand-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
              <div>
                <h2 className="text-3xl font-semibold text-slate-950">Questions from your board?</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Quick answers on cost, onboarding, and access.
                </p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-5">
                    <p className="text-sm font-semibold text-slate-900">Do we pay per module?</p>
                    <p className="mt-2 text-sm text-slate-600">
                      No. Every feature is included so the entire exec team works from the same toolkit.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-5">
                    <p className="text-sm font-semibold text-slate-900">How fast is onboarding?</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Most chapters are fully configured within a week, including bank sync and dues setup.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-5">
                    <p className="text-sm font-semibold text-slate-900">Can alumni get read‑only access?</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Yes. Share reports or grant view‑only roles for oversight without extra cost.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-8 text-center shadow-sm sm:p-10">
                <h2 className="text-3xl font-semibold text-slate-950">Ready to get started?</h2>
                <p className="mt-3 text-slate-600">
                  Talk to our team to learn more about GreekPay and get your chapter set up.
                </p>
                <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <button
                    onClick={() => navigate('/contact')}
                    className="inline-flex items-center justify-center rounded-full bg-[var(--brand-primary)] px-8 py-3 text-base font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                  >
                    Contact Our Team
                  </button>
                  <button
                    onClick={() => navigate('/demo')}
                    className="inline-flex items-center justify-center rounded-full border border-[var(--brand-border)] bg-white px-8 py-3 text-base font-semibold text-slate-700 transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                  >
                    Try the Demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Pricing;
