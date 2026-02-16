import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { X, CreditCard, Building2, AlertCircle, CheckCircle, Trash2, Calendar, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import { PaymentService } from '../services/paymentService';
import { InstallmentService } from '../services/installmentService';
import { supabase } from '../services/supabaseClient';
import { formatCurrency } from '../utils/currency';
import { MemberDuesSummary, SavedPaymentMethod, InstallmentEligibility, InstallmentPlan, DeadlineEligibility } from '../services/types';
import toast from 'react-hot-toast';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface StripeCheckoutModalProps {
  memberDues: MemberDuesSummary;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customAmount?: number; // Optional partial payment amount
}

interface CheckoutFormProps {
  memberDues: MemberDuesSummary;
  clientSecret: string;
  onSuccess: (paymentMethodId?: string) => void;
  onCancel: () => void;
  savePaymentMethod: boolean;
  onSaveToggle: (save: boolean) => void;
  totalCharge: number;
  paymentMethodType: 'card' | 'us_bank_account';
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  memberDues,
  clientSecret,
  onSuccess,
  onCancel,
  savePaymentMethod,
  onSaveToggle,
  totalCharge,
  paymentMethodType,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentComplete, setPaymentComplete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Confirm the payment
      // For ACH (us_bank_account), always redirect to ensure Financial Connections
      // bank verification completes. Card payments stay on page if possible.
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/app/payment-success`,
        },
        redirect: paymentMethodType === 'us_bank_account' ? 'always' : 'if_required',
      });

      if (error) {
        // Payment failed
        setErrorMessage(error.message || 'Payment failed. Please try again.');
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded
        setPaymentComplete(true);
        toast.success('Payment successful!');
        // Pass payment method ID to onSuccess for installment plan creation
        const pmId = typeof paymentIntent.payment_method === 'string'
          ? paymentIntent.payment_method
          : paymentIntent.payment_method?.id;
        setTimeout(() => {
          onSuccess(pmId);
        }, 2000);
      } else if (paymentIntent && paymentIntent.status === 'processing') {
        // Payment is processing (common for ACH)
        setPaymentComplete(true);
        toast.success('Payment is processing. You will receive confirmation once complete.');
        // Pass payment method ID to onSuccess for installment plan creation
        const pmId = typeof paymentIntent.payment_method === 'string'
          ? paymentIntent.payment_method
          : paymentIntent.payment_method?.id;
        setTimeout(() => {
          onSuccess(pmId);
        }, 2000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred');
      toast.error('Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentComplete) {
    return (
      <div className="text-center py-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-emerald-500/30 mb-5">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h3>
        <p className="text-gray-600">
          Thank you for your payment. You will receive a confirmation email shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element - only shows the selected payment method type */}
      <div className="bg-slate-50 p-4 rounded-xl border border-[var(--brand-border)]">
        <PaymentElement
          options={{
            layout: 'accordion',
            paymentMethodOrder: [paymentMethodType],
          }}
        />
      </div>

      {/* Save for Future Checkbox */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={savePaymentMethod}
          onChange={(e) => onSaveToggle(e.target.checked)}
          className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded-md focus:ring-blue-500 focus:ring-2 focus:ring-offset-0 transition-colors cursor-pointer"
        />
        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
          Save this payment method for future payments
        </span>
      </label>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 px-4 py-3.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none font-semibold flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2"></div>
              {paymentMethodType === 'us_bank_account' ? 'Verifying Bank...' : 'Processing...'}
            </>
          ) : (
            `Pay ${formatCurrency(totalCharge)}`
          )}
        </button>
      </div>

      {/* Security Notice */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Secured by Stripe. Your payment information is encrypted and secure.</span>
      </div>
    </form>
  );
};

const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({
  memberDues,
  isOpen,
  onClose,
  onSuccess,
  customAmount,
}) => {
  // Determine the payment amount - use customAmount if provided, otherwise full balance
  const paymentAmount = customAmount ?? memberDues.balance;
  const isPartialPayment = customAmount !== undefined && customAmount < memberDues.balance;
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [paymentMethodType, setPaymentMethodType] = useState<'card' | 'us_bank_account'>('card');

  // Saved payment methods state
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedSavedMethod, setSelectedSavedMethod] = useState<string | null>(null);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [usingSavedMethod, setUsingSavedMethod] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  // Installment plan state
  const [installmentEligibility, setInstallmentEligibility] = useState<InstallmentEligibility | null>(null);
  const [activePlan, setActivePlan] = useState<InstallmentPlan | null>(null);
  const [showInstallmentOption, setShowInstallmentOption] = useState(false);
  const [selectedInstallmentPlan, setSelectedInstallmentPlan] = useState<number | null>(null);
  const [selectedInstallmentMethod, setSelectedInstallmentMethod] = useState<string>('');
  const [creatingInstallmentPlan, setCreatingInstallmentPlan] = useState(false);
  const [installmentCheckoutMode, setInstallmentCheckoutMode] = useState(false);
  const [deadlineInfo, setDeadlineInfo] = useState<DeadlineEligibility | null>(null);

  // Refs for debouncing and preventing duplicate requests
  const createIntentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCreatingIntentRef = useRef(false);
  const lastIntentParamsRef = useRef<string>('');

  useEffect(() => {
    if (isOpen && memberDues.balance > 0) {
      loadSavedPaymentMethods();
      loadInstallmentData();
      setPaymentComplete(false);
      setSelectedSavedMethod(null);
      setUsingSavedMethod(false);
      setShowInstallmentOption(false);
      setSelectedInstallmentPlan(null);
      setSelectedInstallmentMethod('');
      setInstallmentCheckoutMode(false);
      // Reset client secret and params ref when modal opens fresh
      setClientSecret('');
      lastIntentParamsRef.current = '';
    }
  }, [isOpen, memberDues.id]);

  useEffect(() => {
    // Create payment intent when not using a saved method
    // Also recreate when payment method type changes (fees are different for card vs ACH)
    // Also recreate when entering installment checkout mode (different amount)
    if (isOpen && memberDues.balance > 0 && !usingSavedMethod) {
      // Debounce: wait 300ms before creating intent to prevent rapid successive calls
      // This prevents double charges when user quickly toggles payment method type
      if (createIntentTimeoutRef.current) {
        clearTimeout(createIntentTimeoutRef.current);
      }
      createIntentTimeoutRef.current = setTimeout(() => {
        createPaymentIntent();
      }, 300);
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (createIntentTimeoutRef.current) {
        clearTimeout(createIntentTimeoutRef.current);
      }
    };
  }, [isOpen, memberDues.id, usingSavedMethod, savePaymentMethod, paymentMethodType, installmentCheckoutMode, selectedInstallmentPlan]);

  const loadSavedPaymentMethods = async () => {
    try {
      const methods = await PaymentService.getSavedPaymentMethods(memberDues.member_id);
      setSavedMethods(methods);
    } catch (err) {
      console.error('Error loading saved payment methods:', err);
      // Don't show error - just continue without saved methods
    }
  };

  const loadInstallmentData = async () => {
    try {
      const [eligibility, plan, memberProfile, deadlineCheck] = await Promise.all([
        InstallmentService.getEligibility(memberDues.id),
        InstallmentService.getActivePlan(memberDues.id),
        // Also check member-level eligibility
        supabase
          .from('user_profiles')
          .select('installment_eligible')
          .eq('id', memberDues.member_id)
          .single(),
        // Check deadline eligibility
        InstallmentService.checkDeadlineEligibility(memberDues.id)
      ]);

      setDeadlineInfo(deadlineCheck);

      // Member is eligible if either per-dues OR per-member eligibility is true
      const memberEligible = memberProfile?.data?.installment_eligible === true;

      // Also require deadline to be set for installment eligibility
      if (!deadlineCheck.eligible) {
        setInstallmentEligibility(null);
        setActivePlan(plan);
        return;
      }

      if (memberEligible && !eligibility) {
        // Create a synthetic eligibility object for member-level eligibility
        setInstallmentEligibility({
          id: 'member-level',
          member_dues_id: memberDues.id,
          chapter_id: memberDues.chapter_id,
          is_eligible: true,
          allowed_plans: [2, 3], // Default plan options
          enabled_by: null,
          enabled_at: null,
          notes: null,
        });
      } else {
        setInstallmentEligibility(eligibility);
      }

      setActivePlan(plan);
    } catch (err) {
      console.error('Error loading installment data:', err);
    }
  };

  const handleCreateInstallmentPlan = async () => {
    if (!selectedInstallmentPlan || !selectedInstallmentMethod) {
      toast.error('Please select a payment plan and payment method');
      return;
    }

    setCreatingInstallmentPlan(true);
    try {
      const response = await InstallmentService.createPlan(
        memberDues.id,
        selectedInstallmentPlan,
        selectedInstallmentMethod
      );

      if (response.error) {
        toast.error(response.error);
        return;
      }

      if (response.success && response.payment_complete) {
        // Payment succeeded immediately with saved method
        setPaymentComplete(true);
        setShowInstallmentOption(false);
        toast.success('Payment successful! Installment plan created.');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else if (response.success && response.payment_processing) {
        // ACH payment processing
        setPaymentComplete(true);
        setShowInstallmentOption(false);
        toast.success('Payment is processing. Installment plan created!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else if (response.success && response.requires_action && response.first_payment_client_secret) {
        // 3DS verification needed — show Elements for verification
        setClientSecret(response.first_payment_client_secret);
        setShowInstallmentOption(false);
        toast.info('Additional verification required for your payment');
      } else if (response.success) {
        // Fallback — plan created but unexpected payment state
        toast.success('Installment plan created!');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Error creating installment plan:', err);
      toast.error(err.message || 'Failed to create installment plan');
    } finally {
      setCreatingInstallmentPlan(false);
    }
  };

  const createPaymentIntent = useCallback(async () => {
    // Prevent duplicate simultaneous calls
    if (isCreatingIntentRef.current) {
      console.log('Payment intent creation already in progress, skipping');
      return;
    }

    // Create a unique key for this request's parameters
    const intentAmount = installmentCheckoutMode && selectedInstallmentPlan
      ? Math.round((paymentAmount / selectedInstallmentPlan) * 100) / 100
      : paymentAmount;
    const requestParams = `${memberDues.id}-${paymentMethodType}-${intentAmount}-${savePaymentMethod}`;

    // If we already have a client secret for these exact params, don't recreate
    if (clientSecret && lastIntentParamsRef.current === requestParams) {
      console.log('Reusing existing payment intent for same parameters');
      return;
    }

    isCreatingIntentRef.current = true;
    setIsLoading(true);
    setError('');

    try {
      const response = await PaymentService.createPaymentIntent(
        memberDues.id,
        paymentMethodType,
        intentAmount,
        installmentCheckoutMode ? true : savePaymentMethod // Always save in installment mode
      );

      if (response.client_secret) {
        setClientSecret(response.client_secret);
        lastIntentParamsRef.current = requestParams;
      } else {
        throw new Error('Failed to create payment intent');
      }
    } catch (err: any) {
      console.error('Error creating payment intent:', err);
      setError(err.message || 'Failed to initialize payment. Please try again.');
      toast.error('Failed to initialize payment');
    } finally {
      setIsLoading(false);
      isCreatingIntentRef.current = false;
    }
  }, [memberDues.id, paymentAmount, paymentMethodType, savePaymentMethod, installmentCheckoutMode, selectedInstallmentPlan, clientSecret]);

  const handleUseSavedMethod = async (methodId: string) => {
    setIsLoading(true);
    setError('');
    setSelectedSavedMethod(methodId);
    setUsingSavedMethod(true);

    try {
      const response = await PaymentService.createPaymentIntent(
        memberDues.id,
        'card', // Type doesn't matter for saved methods
        paymentAmount,
        false,
        methodId
      );

      if (response.payment_complete) {
        // Payment succeeded immediately
        setPaymentComplete(true);
        toast.success('Payment successful!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else if (response.requires_action) {
        // Need additional action - use Elements
        setClientSecret(response.client_secret || '');
        toast.info('Additional verification required');
      } else {
        // Payment in progress (ACH)
        setPaymentComplete(true);
        toast.success('Payment is processing!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error using saved payment method:', err);
      setError(err.message || 'Failed to process payment. Please try again.');
      toast.error('Failed to process payment');
      setUsingSavedMethod(false);
      setSelectedSavedMethod(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSavedMethod = async (e: React.MouseEvent, methodId: string) => {
    e.stopPropagation(); // Prevent triggering the parent button's onClick
    try {
      await PaymentService.deleteSavedPaymentMethod(methodId, memberDues.member_id);
      setSavedMethods(prev => prev.filter(m => m.stripe_payment_method_id !== methodId));
      toast.success('Payment method removed');
    } catch (err) {
      console.error('Error deleting payment method:', err);
      toast.error('Failed to remove payment method');
    }
  };

  const handleUseNewMethod = () => {
    setUsingSavedMethod(false);
    setSelectedSavedMethod(null);
    createPaymentIntent();
  };

  const handleSuccess = async (paymentMethodId?: string) => {
    // If in installment checkout mode, create the installment plan after first payment
    if (installmentCheckoutMode && selectedInstallmentPlan) {
      try {
        // Use the payment method ID from the completed payment
        // This avoids race condition with webhook saving the method
        if (paymentMethodId) {
          // Create the installment plan with skipFirstPayment flag
          const response = await InstallmentService.createPlan(
            memberDues.id,
            selectedInstallmentPlan,
            paymentMethodId,
            true // skipFirstPayment - first payment already processed
          );

          if (response.success) {
            toast.success(`Installment plan created! ${selectedInstallmentPlan - 1} remaining payments will be charged on schedule.`);
          } else if (response.error) {
            console.error('Error creating installment plan:', response.error);
            toast.error('Payment successful, but failed to create installment plan. Please contact support.');
          }
        } else {
          console.error('No payment method ID from checkout');
          toast.error('Payment successful, but failed to get payment method. Please contact support.');
        }
      } catch (err: any) {
        console.error('Error in installment plan creation:', err);
        toast.error('Payment successful, but failed to create installment plan. Please contact support.');
      }
    }

    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg sm:max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-slideUp sm:animate-none">
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header with gradient */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 px-6 py-5 sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Pay Dues</h2>
                <p className="text-sm text-blue-100 mt-0.5">
                  {memberDues.period_name} - {memberDues.fiscal_year}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 -m-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Payment Summary */}
          <div className="surface-card overflow-hidden mb-6">
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Payment Summary</h3>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Member:</span>
                  <span className="font-medium text-gray-900">{memberDues.member_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Amount:</span>
                  <span className="text-gray-900">{formatCurrency(memberDues.base_amount)}</span>
                </div>
                {memberDues.late_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Late Fee:</span>
                    <span className="text-red-600">{formatCurrency(memberDues.late_fee)}</span>
                  </div>
                )}
                {memberDues.adjustments !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Adjustments:</span>
                    <span className={memberDues.adjustments > 0 ? 'text-red-600' : 'text-green-600'}>
                      {memberDues.adjustments > 0 ? '+' : ''}{formatCurrency(Math.abs(memberDues.adjustments))}
                    </span>
                  </div>
                )}
                {memberDues.amount_paid > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Already Paid:</span>
                    <span className="text-green-600">-{formatCurrency(memberDues.amount_paid)}</span>
                  </div>
                )}
                <div className="pt-3 mt-3 border-t border-[var(--brand-border)] flex justify-between">
                  <span className="font-semibold text-gray-900">
                    {isPartialPayment ? 'Outstanding Balance:' : 'Dues Amount:'}
                  </span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(memberDues.balance)}
                  </span>
                </div>
                {isPartialPayment && (
                  <div className="pt-2 flex justify-between">
                    <span className="font-semibold text-blue-600">Payment Amount:</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(paymentAmount)}
                    </span>
                  </div>
                )}
                {/* Fee Breakdown */}
                <div className="pt-3 mt-1">
                  {paymentMethodType === 'us_bank_account' ? (
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                      <div className="flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                        <p className="text-lg font-bold text-emerald-600">
                          No Processing Fees!
                        </p>
                      </div>
                      <p className="text-xs text-emerald-600 mt-1 text-center">
                        Bank transfer is the recommended payment method
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">Card Processing Fee:</span>
                        <span className="text-gray-900 font-medium">
                          {formatCurrency(PaymentService.calculateStripeFee(
                            installmentCheckoutMode && selectedInstallmentPlan
                              ? Math.round((paymentAmount / selectedInstallmentPlan) * 100) / 100
                              : paymentAmount,
                            paymentMethodType
                          ))}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-600 mt-2 text-center font-medium">
                        Switch to Bank Account (ACH) to avoid fees
                      </p>
                    </div>
                  )}
                </div>
                {/* Total */}
                <div className="pt-4 mt-2 border-t-2 border-blue-200 flex justify-between items-center">
                  <span className="font-semibold text-gray-900">
                    {installmentCheckoutMode && selectedInstallmentPlan ? 'First Payment:' : 'Total to Pay:'}
                  </span>
                  <span className="font-bold text-2xl text-blue-600">
                    {formatCurrency(PaymentService.calculateTotalCharge(
                      installmentCheckoutMode && selectedInstallmentPlan
                        ? Math.round((paymentAmount / selectedInstallmentPlan) * 100) / 100
                        : paymentAmount,
                      paymentMethodType
                    ))}
                  </span>
                </div>
                {installmentCheckoutMode && selectedInstallmentPlan && (
                  <div className="mt-2 text-xs text-purple-600 text-center font-medium">
                    {selectedInstallmentPlan - 1} additional payments of {formatCurrency(paymentAmount / selectedInstallmentPlan)} scheduled before deadline
                  </div>
                )}
                {isPartialPayment && !installmentCheckoutMode && (
                  <div className="mt-2 text-xs text-blue-600 text-center font-medium">
                    Remaining balance after payment: {formatCurrency(memberDues.balance - paymentAmount)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Installment Plan Option - disabled for partial payments */}
          {installmentEligibility?.is_eligible && !paymentComplete && !activePlan && !isPartialPayment && (
            <div className="mb-6">
              {!showInstallmentOption ? (
                <button
                  onClick={() => setShowInstallmentOption(true)}
                  className="group w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600 group-hover:scale-105 transition-transform">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Pay in Installments</p>
                      <p className="text-xs text-gray-600">
                        Split into {installmentEligibility.allowed_plans.join(' or ')} payments before deadline
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-purple-500 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <div className="surface-card overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-white">Payment Plan</h3>
                      </div>
                      <button
                        onClick={() => setShowInstallmentOption(false)}
                        className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Plan Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Payment Plan
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {installmentEligibility.allowed_plans.map(plan => (
                          <button
                            key={plan}
                            type="button"
                            onClick={() => setSelectedInstallmentPlan(plan)}
                            className={`p-4 rounded-xl border-2 transition-all duration-200 text-center hover:shadow-md ${
                              selectedInstallmentPlan === plan
                                ? 'border-purple-500 bg-purple-50 shadow-md'
                                : 'border-[var(--brand-border)] bg-white hover:border-purple-300'
                            }`}
                          >
                            <p className="font-bold text-lg text-gray-900">{plan}</p>
                            <p className="text-xs text-gray-500">Payments</p>
                            <p className="text-sm font-semibold text-purple-600 mt-2">
                              {formatCurrency(memberDues.balance / plan)} each
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payment Schedule Preview */}
                    {selectedInstallmentPlan && deadlineInfo?.deadline && (
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-sm font-medium text-gray-700 mb-3">
                          Payment Schedule
                        </p>
                        <div className="space-y-2">
                          {InstallmentService.generateScheduleDates(
                            new Date(),
                            selectedInstallmentPlan,
                            new Date(deadlineInfo.deadline)
                          ).map((date, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">
                                Payment {idx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                {idx === selectedInstallmentPlan - 1 && (
                                  <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                                    Deadline
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment Method Selection - only show if saved methods exist */}
                    {savedMethods.length > 0 ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method (for auto-pay)
                        </label>
                        <select
                          value={selectedInstallmentMethod}
                          onChange={(e) => setSelectedInstallmentMethod(e.target.value)}
                          className="w-full p-3 border border-[var(--brand-border)] rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow"
                        >
                          <option value="">Select a saved payment method</option>
                          {savedMethods.map(method => (
                            <option key={method.id} value={method.stripe_payment_method_id}>
                              {method.brand} ****{method.last4}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-purple-800">
                          <CreditCard className="w-5 h-5" />
                          <p className="text-sm font-medium">Your payment method will be saved during checkout for future payments</p>
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                      <p>Your first payment will be charged today. Remaining payments will be automatically charged according to the schedule above, with the final payment due on the deadline.</p>
                    </div>

                    {/* Action Button */}
                    {savedMethods.length > 0 ? (
                      <button
                        onClick={handleCreateInstallmentPlan}
                        disabled={!selectedInstallmentPlan || !selectedInstallmentMethod || creatingInstallmentPlan}
                        className="w-full px-4 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none font-semibold flex items-center justify-center"
                      >
                        {creatingInstallmentPlan ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                            Creating Plan...
                          </>
                        ) : selectedInstallmentPlan ? (
                          `Start ${selectedInstallmentPlan}-Payment Plan`
                        ) : (
                          'Select a Plan'
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (!selectedInstallmentPlan) {
                            toast.error('Please select a payment plan');
                            return;
                          }
                          setInstallmentCheckoutMode(true);
                          setShowInstallmentOption(false);
                          setSavePaymentMethod(true); // Force save payment method
                        }}
                        disabled={!selectedInstallmentPlan}
                        className="w-full px-4 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none font-semibold flex items-center justify-center"
                      >
                        {selectedInstallmentPlan ? (
                          `Continue to Checkout - ${formatCurrency(memberDues.balance / selectedInstallmentPlan)} First Payment`
                        ) : (
                          'Select a Plan'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Installment Plan Notice */}
          {activePlan && !paymentComplete && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-green-800">
                    Active Installment Plan
                  </p>
                  <p className="text-sm text-green-600">
                    {activePlan.installments_paid} of {activePlan.num_installments} payments completed.
                    Next payment: {activePlan.next_payment_date}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Saved Payment Methods */}
          {savedMethods.length > 0 && !paymentComplete && !showInstallmentOption && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Saved Payment Methods</h3>
              <div className="space-y-2">
                {savedMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => handleUseSavedMethod(method.stripe_payment_method_id)}
                    disabled={isLoading}
                    className={`group w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                      selectedSavedMethod === method.stripe_payment_method_id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-[var(--brand-border)] hover:border-blue-300 bg-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${
                        method.type === 'card'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {method.type === 'card' ? (
                          <CreditCard className="w-5 h-5" />
                        ) : (
                          <Building2 className="w-5 h-5" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">
                          {method.brand} ****{method.last4}
                        </p>
                        <p className="text-xs text-gray-500">
                          {method.type === 'card' ? 'Credit/Debit Card' : 'Bank Account'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {method.is_default && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                          Default
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteSavedMethod(e, method.stripe_payment_method_id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove payment method"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </button>
                ))}
                <button
                  onClick={handleUseNewMethod}
                  disabled={isLoading}
                  className={`group w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all duration-200 ${
                    !usingSavedMethod
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-400 bg-gray-50/50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-gray-700">Use a new payment method</span>
                </button>
              </div>
            </div>
          )}

          {/* Payment Methods Info - only show when using new method */}
          {(!usingSavedMethod || savedMethods.length === 0) && !paymentComplete && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Choose Payment Method</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethodType('card')}
                  className={`group relative rounded-xl p-4 border-2 transition-all duration-200 text-left hover:shadow-md hover:-translate-y-0.5 ${
                    paymentMethodType === 'card'
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-[var(--brand-border)] bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-110 ${
                      paymentMethodType === 'card'
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Credit/Debit Card</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Instant processing</p>
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        Fee: {formatCurrency(PaymentService.calculateStripeFee(paymentAmount, 'card'))}
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethodType('us_bank_account')}
                  className={`group relative rounded-xl p-4 border-2 transition-all duration-200 text-left hover:shadow-md hover:-translate-y-0.5 ${
                    paymentMethodType === 'us_bank_account'
                      ? 'border-emerald-500 bg-emerald-50 shadow-md'
                      : 'border-[var(--brand-border)] bg-white hover:border-emerald-300'
                  }`}
                >
                  {/* Recommended badge */}
                  <div className="absolute -top-2 -right-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm">
                      <Sparkles className="w-3 h-3" />
                      BEST VALUE
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-110 ${
                      paymentMethodType === 'us_bank_account'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Bank Account (ACH)</h4>
                      <p className="text-xs text-gray-500 mt-0.5">3-5 business days</p>
                      <p className="text-xs text-emerald-600 mt-1 font-bold">
                        No fees!
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Payment Complete Message */}
          {paymentComplete && (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-emerald-500/30 mb-5">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Successful!
              </h3>
              <p className="text-gray-600">
                Thank you for your payment. You will receive a confirmation email shortly.
              </p>
            </div>
          )}

          {/* Checkout Form - only show when not using saved method and not complete */}
          {!paymentComplete && !usingSavedMethod && (
            <>
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-200 border-t-blue-600"></div>
                    </div>
                    <p className="text-gray-600 font-medium">Initializing secure payment...</p>
                    <p className="text-xs text-gray-500 mt-1">This may take a moment</p>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 mb-1">Payment Error</h3>
                      <p className="text-sm text-red-700 mb-4">{error}</p>
                      <button
                        onClick={createPaymentIntent}
                        className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              ) : clientSecret ? (
                <>
                  {/* Installment Mode Banner */}
                  {installmentCheckoutMode && selectedInstallmentPlan && (
                    <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-purple-900">
                            Setting up {selectedInstallmentPlan}-Payment Plan
                          </p>
                          <p className="text-sm text-purple-700">
                            Complete this first payment to activate your installment plan
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <Elements
                    key={clientSecret}
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#2563eb',
                          colorBackground: '#ffffff',
                          colorText: '#1f2937',
                          colorDanger: '#dc2626',
                          fontFamily: 'system-ui, sans-serif',
                          borderRadius: '8px',
                        },
                      },
                    }}
                  >
                    <CheckoutForm
                      memberDues={memberDues}
                      clientSecret={clientSecret}
                      onSuccess={handleSuccess}
                      onCancel={onClose}
                      savePaymentMethod={installmentCheckoutMode ? true : savePaymentMethod}
                      onSaveToggle={installmentCheckoutMode ? () => {} : setSavePaymentMethod}
                      totalCharge={PaymentService.calculateTotalCharge(
                        installmentCheckoutMode && selectedInstallmentPlan
                          ? Math.round((paymentAmount / selectedInstallmentPlan) * 100) / 100
                          : paymentAmount,
                        paymentMethodType
                      )}
                      paymentMethodType={paymentMethodType}
                    />
                  </Elements>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StripeCheckoutModal;
