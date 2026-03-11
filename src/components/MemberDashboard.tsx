import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Clock,
  Lock,
  Mail,
  DollarSign,
  LogOut,
  Pencil,
  Calendar,
  CheckCircle,
  Receipt,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MemberDuesInfo } from '../services/authService';
import { DuesService } from '../services/duesService';
import { InstallmentService } from '../services/installmentService';
import { MemberDuesSummary, InstallmentPlanWithPayments } from '../services/types';
import ProfileEditModal from './ProfileEditModal';
import PaymentHistoryModal from './PaymentHistoryModal';
import PasswordChangeModal from './PasswordChangeModal';
import ReimbursementRequestModal from './ReimbursementRequestModal';
import PayDuesButton from './PayDuesButton';
import { getYearLabel } from '../utils/yearUtils';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const getInitials = (name: string | undefined): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getFirstName = (name: string | undefined): string => {
  if (!name) return 'Member';
  const parts = name.trim().split(' ');
  return parts[0] || 'Member';
};

export const MemberDashboard: React.FC = () => {
  const { profile, getMemberDues, signOut } = useAuth();
  const [duesInfo, setDuesInfo] = useState<MemberDuesInfo | null>(null);
  const [memberDuesSummary, setMemberDuesSummary] = useState<MemberDuesSummary[]>([]);
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlanWithPayments[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isReimbursementModalOpen, setIsReimbursementModalOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void loadDuesInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDuesInfo = async () => {
    try {
      setIsLoading(true);
      setRefreshKey(prev => prev + 1); // Trigger re-check of pending payments
      const info = await getMemberDues();
      setDuesInfo(info);

      // Also fetch detailed dues summary for payment button
      if (profile?.email) {
        const summary = await DuesService.getMemberDuesSummaryByEmail(profile.email);
        setMemberDuesSummary(summary);

        // Fetch installment plans for each dues item
        const plans: InstallmentPlanWithPayments[] = [];
        for (const dues of summary) {
          try {
            // First get the active plan by member_dues_id
            const activePlan = await InstallmentService.getActivePlan(dues.id);
            if (activePlan) {
              // Then get the full plan with payments using the plan's id
              const planWithPayments = await InstallmentService.getPlanWithPayments(activePlan.id);
              if (planWithPayments) {
                plans.push(planWithPayments);
              }
            }
          } catch {
            // No plan for this dues - that's ok
          }
        }
        setInstallmentPlans(plans);
      }
    } catch (error) {
      console.error('Error loading dues info:', error);
      toast.error('Unable to load dues information right now.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)]">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
          Loading your dashboard...
        </div>
      </div>
    );
  }

  const duesBalance = duesInfo?.dues_balance ?? profile?.dues_balance ?? 0;
  const isOwed = duesBalance > 0;
  const chapterName = duesInfo?.chapter_name || 'Your Chapter';

  return (
    <div className="min-h-screen bg-[var(--brand-surface)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--brand-border)] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/GreekPay-logo-transparent.png"
              alt="GreekPay Logo"
              className="h-10 sm:h-14 w-auto"
            />
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-5">

          {/* Greeting */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Hey, {getFirstName(profile?.full_name)}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">{chapterName}</p>
          </div>

          {/* ===== TOP SECTION: CTAs + Balance ===== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left: Two primary CTAs (span 2 cols on desktop) */}
            <div className="md:col-span-2 space-y-3">
              {/* Dues Cards */}
              {isOwed && memberDuesSummary.length > 0 ? (
                <>
                  {memberDuesSummary.filter(d => d.balance > 0).map((dues) => {
                    const duesLabel = dues.notes || dues.period_name || 'Dues';
                    const hasDueDate = !!dues.due_date;
                    const dueDate = hasDueDate ? new Date(dues.due_date!) : null;
                    const today = new Date();
                    const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                    const isOverdue = daysLeft !== null && daysLeft < 0;
                    const isPartial = dues.amount_paid > 0;

                    return (
                      <div
                        key={dues.id}
                        className={`rounded-2xl border-2 bg-white p-4 sm:p-5 ${
                          isOverdue ? 'border-rose-300' : 'border-[var(--brand-border)]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-base font-semibold text-slate-900 truncate">{duesLabel}</h3>
                              {isOverdue && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 flex-shrink-0">
                                  <AlertTriangle className="h-3 w-3" />
                                  Overdue
                                </span>
                              )}
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(dues.balance)}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                              {isPartial && (
                                <span className="text-xs text-slate-500">
                                  {formatCurrency(dues.amount_paid)} of {formatCurrency(dues.total_amount)} paid
                                </span>
                              )}
                              {dueDate && (
                                <span className={`text-xs ${isOverdue ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
                                  Due {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  {isOverdue
                                    ? ` (${Math.abs(daysLeft!)}d overdue)`
                                    : daysLeft !== null && daysLeft <= 14 ? ` (${daysLeft}d left)` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <PayDuesButton
                              memberDues={dues}
                              onPaymentSuccess={loadDuesInfo}
                              refreshKey={refreshKey}
                              variant="primary"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPaymentHistoryModalOpen(true)}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-emerald-50 border-2 border-emerald-200 py-6 sm:py-8 px-6 text-center transition-all active:scale-[0.98]"
                >
                  <CheckCircle className="h-7 w-7 text-emerald-600" />
                  <span className="text-lg font-semibold text-emerald-700">All Paid</span>
                </button>
              )}

              {/* Request Reimbursement — full width, secondary */}
              <button
                type="button"
                onClick={() => setIsReimbursementModalOpen(true)}
                className="w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-[var(--brand-emerald)] bg-white py-4 sm:py-5 px-6 text-center transition-all hover:bg-emerald-50 active:scale-[0.98]"
              >
                <Receipt className="h-5 w-5 text-[var(--brand-emerald)]" />
                <span className="text-base font-semibold text-[var(--brand-emerald)]">Request Reimbursement</span>
              </button>
            </div>

            {/* Right: Balance card */}
            <div className="rounded-2xl bg-white border border-[var(--brand-border)] p-5 flex flex-col justify-center">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Balance</p>
                  <p className={`text-3xl font-bold tracking-tight mt-1 ${
                    isOwed ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {formatCurrency(Math.abs(duesBalance))}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isOwed
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isOwed ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                  {isOwed ? 'Due' : 'Paid'}
                </span>
              </div>

              {/* Earliest due date */}
              {isOwed && (() => {
                const withDates = memberDuesSummary.filter(d => d.due_date && d.balance > 0);
                if (withDates.length === 0) return null;
                const earliest = withDates.reduce((a, b) =>
                  new Date(a.due_date!) <= new Date(b.due_date!) ? a : b
                );
                const dueDate = new Date(earliest.due_date!);
                const today = new Date();
                const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const overdue = daysLeft < 0;
                return (
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className={overdue ? 'text-rose-600 font-medium' : ''}>
                      Due {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {overdue
                        ? ` (${Math.abs(daysLeft)}d overdue)`
                        : daysLeft <= 14 ? ` (${daysLeft}d left)` : ''}
                    </span>
                  </div>
                );
              })()}

              {/* Earliest Flexible Payment Plan Deadline */}
              {(() => {
                const withDeadlines = memberDuesSummary.filter(d => d.flexible_plan_deadline && d.balance > 0);
                if (withDeadlines.length === 0) return null;
                const earliest = withDeadlines.reduce((a, b) =>
                  new Date(a.flexible_plan_deadline!) <= new Date(b.flexible_plan_deadline!) ? a : b
                );
                const deadline = new Date(earliest.flexible_plan_deadline!);
                const today = new Date();
                const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-600 flex-shrink-0" />
                      <p className="text-xs text-purple-700">
                        Payment plan deadline: {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {daysRemaining > 0 && <span className="text-purple-500"> ({daysRemaining}d left)</span>}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ===== ACTIVE INSTALLMENT PLANS ===== */}
          {installmentPlans.length > 0 && installmentPlans.map((plan) => {
            const completedPayments = plan.payments.filter(p => p.status === 'succeeded').length;
            const progressPercentage = (completedPayments / plan.num_installments) * 100;
            const nextPayment = plan.payments.find(p => p.status === 'scheduled');

            return (
              <div key={plan.id} className="rounded-2xl bg-white border border-[var(--brand-border)] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-slate-900 text-sm">Payment Plan</h3>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    plan.status === 'active' ? 'bg-blue-50 text-blue-700'
                    : plan.status === 'completed' ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                  }`}>
                    {plan.status === 'active' ? 'Active' : plan.status === 'completed' ? 'Done' : 'Cancelled'}
                  </span>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500">{completedPayments}/{plan.num_installments} payments</span>
                    <span className="font-medium text-slate-700">{formatCurrency(plan.installment_amount)} each</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--brand-primary)] rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Payment list */}
                <div className="space-y-1.5">
                  {plan.payments.map((payment, idx) => (
                    <div
                      key={payment.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                        payment.status === 'succeeded' ? 'bg-emerald-50'
                        : payment.status === 'failed' ? 'bg-rose-50'
                        : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {payment.status === 'succeeded' ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-slate-600">{idx + 1}</span>
                        )}
                        <span className="text-slate-700">
                          {payment.status === 'succeeded' && payment.processed_at
                            ? new Date(payment.processed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : new Date(payment.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          }
                        </span>
                      </div>
                      <span className="font-medium text-slate-900">{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                </div>

                {nextPayment && plan.status === 'active' && (
                  <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <p className="text-xs text-blue-700">
                        Next: {formatCurrency(nextPayment.amount)} on {new Date(nextPayment.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ===== SECONDARY ACTIONS ===== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setIsPaymentHistoryModalOpen(true)}
              className="flex items-center gap-3 rounded-xl bg-white border border-[var(--brand-border)] py-4 px-5 text-left transition-all hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] active:scale-[0.98]"
            >
              <Clock className="h-5 w-5 text-[var(--brand-primary)] flex-shrink-0" />
              <span className="text-sm font-medium text-[var(--brand-text)]">Payment History</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const email = 'joseph@greekpay.org';
                const subject = 'Question about dues';
                const body = `Hi,\n\nI have a question about my dues balance.\n\nBest regards,\n${profile?.full_name || ''}`;
                window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
              }}
              className="flex items-center gap-3 rounded-xl bg-white border border-[var(--brand-border)] py-4 px-5 text-left transition-all hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] active:scale-[0.98]"
            >
              <Mail className="h-5 w-5 text-[var(--brand-primary)] flex-shrink-0" />
              <span className="text-sm font-medium text-[var(--brand-text)]">Contact Us</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="flex items-center gap-3 rounded-xl bg-white border border-[var(--brand-border)] py-4 px-5 text-left transition-all hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] active:scale-[0.98]"
            >
              <Lock className="h-5 w-5 text-[var(--brand-primary)] flex-shrink-0" />
              <span className="text-sm font-medium text-[var(--brand-text)]">Security</span>
            </button>
            <button
              type="button"
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-3 rounded-xl bg-white border border-[var(--brand-border)] py-4 px-5 text-left transition-all hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] active:scale-[0.98]"
            >
              <ChevronDown className={`h-5 w-5 text-[var(--brand-primary)] flex-shrink-0 transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
              <span className="text-sm font-medium text-[var(--brand-text)]">My Profile</span>
            </button>
          </div>

          {/* ===== COLLAPSIBLE PROFILE ===== */}
          {showProfile && (
            <div className="rounded-2xl bg-white border border-[var(--brand-border)] overflow-hidden">
              <div className="px-5 py-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-700">My Profile</span>
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(true)}
                    className="text-xs text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] font-medium flex items-center gap-1"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                  {[
                    { label: 'Email', value: profile?.email },
                    { label: 'Year', value: profile?.year ? getYearLabel(profile.year) : null },
                    { label: 'Major', value: profile?.major },
                    { label: 'Position', value: profile?.position || 'Member' },
                    { label: 'Phone', value: profile?.phone_number },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className="text-sm font-medium text-slate-900 text-right truncate max-w-[60%]">
                        {value || <span className="text-slate-300">--</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSuccess={loadDuesInfo}
      />

      <PaymentHistoryModal
        isOpen={isPaymentHistoryModalOpen}
        onClose={() => setIsPaymentHistoryModalOpen(false)}
      />

      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      <ReimbursementRequestModal
        isOpen={isReimbursementModalOpen}
        onClose={() => setIsReimbursementModalOpen(false)}
      />
    </div>
  );
};
