import React, { useState, useEffect } from 'react';
import { X, CreditCard, Building2, ExternalLink, Clock, Receipt, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DuesService } from '../services/duesService';
import { DuesPayment, DuesPaymentOnline, MemberDues } from '../services/types';
import toast from 'react-hot-toast';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * PaymentHistoryModal
 *
 * Displays a member's payment history for dues including:
 * - All payments made
 * - Payment dates, amounts, and methods
 * - Total amount paid
 */
const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose
}) => {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<DuesPaymentOnline[]>([]);
  const [memberDues, setMemberDues] = useState<MemberDues[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && profile?.id) {
      loadPaymentHistory();
    }
  }, [isOpen, profile?.id]);

  const loadPaymentHistory = async () => {
    if (!profile?.id) return;

    setIsLoading(true);
    try {
      // Get all member dues records for this member
      const duesRecords = await DuesService.getMemberDuesByMember(profile.id);
      setMemberDues(duesRecords);

      // Get all payments for all dues records
      const allPayments: DuesPaymentOnline[] = [];
      for (const dues of duesRecords) {
        const duesPayments = await DuesService.getPayments(dues.id);
        allPayments.push(...duesPayments as DuesPaymentOnline[]);
      }

      // Sort by payment date (most recent first)
      allPayments.sort((a, b) =>
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );

      setPayments(allPayments);
    } catch (error) {
      console.error('Error loading payment history:', error);
      toast.error('Failed to load payment history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const isStripePayment = (method: string | null) => {
    return method?.toLowerCase().includes('stripe');
  };

  const getPaymentIcon = (payment: DuesPaymentOnline) => {
    if (isStripePayment(payment.payment_method)) {
      const isACH = payment.payment_method?.includes('ach');
      return isACH ? <Building2 className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />;
    }
    return null;
  };

  const getPaymentMethodDisplay = (payment: DuesPaymentOnline) => {
    if (!payment.payment_method) return 'Cash';

    // Format Stripe payment methods nicely
    if (isStripePayment(payment.payment_method)) {
      const isACH = payment.payment_method.includes('ach');
      const isCard = payment.payment_method.includes('card');

      if (isACH) return 'Bank Account (ACH)';
      if (isCard) return 'Credit/Debit Card';
      return 'Online Payment';
    }

    return payment.payment_method;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-slideUp sm:animate-none">
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-600 px-6 py-5 sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  Payment History
                </h2>
                <p className="text-xs sm:text-sm text-purple-100 mt-0.5">
                  Your dues payment records
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors active:scale-95 touch-manipulation"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {isLoading ? (
            // Loading State
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-50 mb-4">
                  <div className="animate-spin rounded-full h-7 w-7 border-3 border-purple-200 border-t-purple-600"></div>
                </div>
                <p className="text-sm text-gray-600 font-medium">Loading payment history...</p>
              </div>
            </div>
          ) : payments.length === 0 ? (
            // Empty State
            <div className="text-center py-16">
              <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center mb-5 border border-purple-100">
                <FileText className="h-9 w-9 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No payment history yet
              </h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                When you make dues payments, they will appear here for your records.
              </p>
            </div>
          ) : (
            // Payment List
            <>
              {/* Summary Card */}
              <div className="surface-card overflow-hidden mb-6">
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                        <Clock className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Total Payments Made
                        </p>
                        <p className="text-xs text-gray-500">
                          {payments.length} payment{payments.length !== 1 ? 's' : ''} recorded
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(totalPaid)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Table */}
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="border border-[var(--brand-border)] rounded-xl p-4 hover:bg-slate-50 transition-all duration-200 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <span className="text-lg sm:text-xl font-bold text-gray-900">
                            {formatCurrency(payment.amount)}
                          </span>
                          {payment.payment_method && (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit ${
                              isStripePayment(payment.payment_method)
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {getPaymentIcon(payment)}
                              {getPaymentMethodDisplay(payment)}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-gray-600 space-y-0.5">
                          <p>
                            <span className="font-medium">Date:</span> {formatDate(payment.payment_date)}
                          </p>
                          {payment.stripe_charge_id && (
                            <p className="truncate flex items-center gap-1">
                              <span className="font-medium">Stripe ID:</span>
                              <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                {payment.stripe_charge_id.substring(0, 20)}...
                              </code>
                              <a
                                href={`https://dashboard.stripe.com/payments/${payment.stripe_charge_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:underline"
                                title="View in Stripe Dashboard"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </p>
                          )}
                          {payment.reference_number && !payment.stripe_charge_id && (
                            <p className="truncate">
                              <span className="font-medium">Ref:</span> {payment.reference_number}
                            </p>
                          )}
                          {payment.reconciled && (
                            <p className="flex items-center gap-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Reconciled
                              </span>
                              {payment.reconciled_at && (
                                <span className="text-xs">
                                  on {formatDate(payment.reconciled_at)}
                                </span>
                              )}
                            </p>
                          )}
                          {payment.notes && (
                            <p className="mt-1 italic text-xs">
                              {payment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-green-100 text-green-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--brand-border)] p-4 sm:p-6 bg-slate-50/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all active:scale-[0.99] touch-manipulation font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryModal;
