import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DollarSign,
  Settings,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
  Edit2,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronRight,
  XCircle,
  CreditCard
} from 'lucide-react';
import { DuesService } from '../services/duesService';
import { InstallmentService } from '../services/installmentService';
import { formatCurrency } from '../utils/currency';
import { AuthService } from '../services/authService';
import {
  DuesConfiguration,
  MemberDuesSummary,
  ChapterDuesStats,
  Member,
  InstallmentPlanWithPayments
} from '../services/types';
import DuesConfigurationModal from './DuesConfigurationModal';
import PayDuesButton from './PayDuesButton';
import StripeConnectSetup from './StripeConnectSetup';
import AssignDuesModal from './AssignDuesModal';
import BulkAssignDuesModal from './BulkAssignDuesModal';
import InstallmentEligibilityModal from './InstallmentEligibilityModal';
import ApplyCustomLateFeeModal from './ApplyCustomLateFeeModal';
import EditMemberDuesModal from './EditMemberDuesModal';
import toast from 'react-hot-toast';
import { getYearLabel, YEAR_OPTIONS } from '../utils/yearUtils';

const computeStatsFromSummaries = (
  summaries: MemberDuesSummary[],
  config: DuesConfiguration
): ChapterDuesStats => {
  const base: ChapterDuesStats = {
    chapter_id: config.chapter_id,
    period_name: config.period_name,
    fiscal_year: config.fiscal_year,
    total_members: summaries.length,
    members_paid: 0,
    members_pending: 0,
    members_overdue: 0,
    members_partial: 0,
    total_expected: 0,
    total_collected: 0,
    total_outstanding: 0,
    total_late_fees: 0,
    payment_rate: 0
  };

  const aggregated = summaries.reduce((acc, summary) => {
    acc.total_expected += summary.total_amount;
    acc.total_collected += summary.amount_paid;
    acc.total_outstanding += summary.balance;
    acc.total_late_fees += summary.late_fee;

    switch (summary.status) {
      case 'paid':
        acc.members_paid += 1;
        break;
      case 'overdue':
        acc.members_overdue += 1;
        break;
      case 'partial':
        acc.members_partial += 1;
        break;
      case 'pending':
      default:
        acc.members_pending += 1;
        break;
    }

    return acc;
  }, { ...base });

  if (aggregated.total_expected > 0) {
    aggregated.payment_rate = Number(
      ((aggregated.total_collected / aggregated.total_expected) * 100).toFixed(1)
    );
  }

  return aggregated;
};

interface MemberGroup {
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberYear: string | null;
  dues: MemberDuesSummary[];
  totalBalance: number;
  allPaid: boolean;
  unpaidLabels: string[];
}

interface DemoDuesData {
  configurations: DuesConfiguration[];
  current: DuesConfiguration;
  memberSummaries: MemberDuesSummary[];
  stats: ChapterDuesStats;
  members: Member[];
}

interface DuesManagementSectionProps {
  chapterId: string;
  demoData?: DemoDuesData;
}

const DuesManagementSection: React.FC<DuesManagementSectionProps> = ({ chapterId, demoData }) => {
  const isDemo = Boolean(demoData);
  const demoSeedKeyRef = useRef<string | null>(null);

  const [configurations, setConfigurations] = useState<DuesConfiguration[]>(demoData?.configurations ?? []);
  const [currentConfig, setCurrentConfig] = useState<DuesConfiguration | null>(demoData?.current ?? null);
  const [memberDues, setMemberDues] = useState<MemberDuesSummary[]>(demoData?.memberSummaries ?? []);
  const [stats, setStats] = useState<ChapterDuesStats | null>(demoData?.stats ?? null);
  const [, setMembers] = useState<Member[]>(demoData?.members ?? []);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DuesConfiguration | undefined>();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEmailAssignModal, setShowEmailAssignModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [selectedMemberDues, setSelectedMemberDues] = useState<MemberDuesSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Expanded member rows
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  // Installment eligibility modal
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [installmentMemberDues, setInstallmentMemberDues] = useState<MemberDuesSummary | null>(null);

  // Custom late fee modal
  const [showCustomLateFeeModal, setShowCustomLateFeeModal] = useState(false);

  // Edit dues modal
  const [showEditDuesModal, setShowEditDuesModal] = useState(false);
  const [editingDues, setEditingDues] = useState<MemberDuesSummary | null>(null);

  // Payment plans
  const [activePlans, setActivePlans] = useState<InstallmentPlanWithPayments[]>([]);
  const [cancellingPlanId, setCancellingPlanId] = useState<string | null>(null);

  const applyDemoData = useCallback(() => {
    if (!demoData) return;
    setConfigurations(demoData.configurations);
    setCurrentConfig(demoData.current);
    setMemberDues(demoData.memberSummaries);
    setStats(demoData.stats);
    setMembers(demoData.members);
  }, [demoData]);

  // Load data
  useEffect(() => {
    if (isDemo) {
      if (demoData) {
        const key = `${demoData.current?.id ?? 'unknown'}-${demoData.memberSummaries.length}`;
        if (demoSeedKeyRef.current !== key) {
          applyDemoData();
          demoSeedKeyRef.current = key;
        }
      }
      return;
    }

    demoSeedKeyRef.current = null;
    loadData();
  }, [chapterId, isDemo, applyDemoData, demoData]);

  const loadData = async () => {
    if (isDemo) return;
    try {
      const [configs, current, membersData] = await Promise.all([
        DuesService.getConfigurations(chapterId),
        DuesService.getCurrentConfiguration(chapterId),
        AuthService.getChapterMembers(chapterId)
      ]);

      setConfigurations(configs);
      setCurrentConfig(current);
      setMembers(membersData);

      // Load all dues across all configs (no config filter)
      const duesData = await DuesService.getMemberDues(chapterId);
      setMemberDues(duesData);

      if (current) {
        setStats(computeStatsFromSummaries(duesData, current));
      }

      // Load active installment plans
      try {
        const plans = await InstallmentService.getChapterActivePlans(chapterId);
        setActivePlans(plans);
      } catch (err) {
        console.error('Error loading active plans:', err);
      }
    } catch (error) {
      console.error('Error loading dues data:', error);
      toast.error('Failed to load dues data');
    }
  };

  const handleConfigSaved = () => {
    setShowConfigModal(false);
    setEditingConfig(undefined);
    loadData();
  };

  const handleApplyLateFees = async () => {
    if (isDemo) {
      toast.success('Demo: late fees are already applied in this example.');
      return;
    }
    if (!currentConfig) {
      toast.error('No current configuration found');
      return;
    }

    if (!confirm('This will apply late fees to all overdue members. Continue?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await DuesService.applyLateFees(chapterId, currentConfig.id);
      toast.success(`Applied late fees to ${result.applied} members`);
      loadData();
    } catch (error) {
      console.error('Error applying late fees:', error);
      toast.error('Failed to apply late fees');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberDues) return;

    const amountNumeric = parseFloat(paymentAmount || '0');
    if (Number.isNaN(amountNumeric) || amountNumeric <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }

    if (isDemo) {
      const remaining = selectedMemberDues.total_amount - selectedMemberDues.amount_paid;
      const appliedAmount = Math.min(amountNumeric, remaining);

      if (appliedAmount <= 0) {
        toast.error('This member already has a zero balance.');
        return;
      }

      const updatedSummaries = memberDues.map((summary) => {
        if (summary.id !== selectedMemberDues.id) return summary;
        const newAmountPaid = summary.amount_paid + appliedAmount;
        const newBalance = Math.max(summary.total_amount - newAmountPaid, 0);
        const newStatus = newBalance <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : summary.status;
        return {
          ...summary,
          amount_paid: newAmountPaid,
          balance: newBalance,
          status: newStatus,
          paid_date: newStatus === 'paid' ? paymentDate : summary.paid_date,
          is_overdue: newBalance > 0 ? summary.is_overdue : false,
          days_overdue: newBalance > 0 ? summary.days_overdue : 0,
          updated_at: new Date().toISOString()
        };
      });

      setMemberDues(updatedSummaries);
      if (currentConfig) {
        setStats(computeStatsFromSummaries(updatedSummaries, currentConfig));
      }

      toast.success('Payment recorded (demo)');
      setShowPaymentModal(false);
      resetPaymentForm();
      return;
    }

    setIsProcessing(true);
    try {
      const result = await DuesService.recordPayment(
        selectedMemberDues.id,
        amountNumeric,
        paymentMethod,
        paymentDate,
        paymentReference || undefined,
        paymentNotes || undefined
      );

      if (result.success) {
        toast.success('Payment recorded successfully');
        setShowPaymentModal(false);
        resetPaymentForm();
        loadData();
      } else {
        toast.error(result.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetPaymentForm = () => {
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentReference('');
    setPaymentNotes('');
    setSelectedMemberDues(null);
  };

  const openPaymentModal = (memberDue: MemberDuesSummary) => {
    setSelectedMemberDues(memberDue);
    setPaymentAmount(memberDue.balance.toString());
    setShowPaymentModal(true);
  };

  const handleDeleteDues = async (dues: MemberDuesSummary) => {
    if (isDemo) {
      toast.error('Cannot delete in demo mode');
      return;
    }

    const duesLabel = dues.notes || dues.period_name || 'Dues';
    const confirmed = window.confirm(
      `Are you sure you want to delete "${duesLabel}" for ${dues.member_name}?\n\nAmount: ${formatCurrency(dues.total_amount)}\nStatus: ${dues.status}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await DuesService.deleteMemberDues(dues.id);
      toast.success('Dues deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting dues:', error);
      toast.error('Failed to delete dues');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    try {
      const csv = DuesService.exportToCSV(memberDues);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dues_${currentConfig?.period_name || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Dues data exported successfully');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export dues data');
    }
  };

  const toggleExpanded = (memberId: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  // Unique period names for the filter dropdown
  const periodOptions = Array.from(
    new Set(memberDues.map(d => d.notes || d.period_name).filter(Boolean))
  );

  // Filter dues
  const filteredDues = memberDues.filter(dues => {
    const matchesStatus = filterStatus === 'all' || dues.status === filterStatus;
    const matchesYear = filterYear === 'all' || dues.member_year === filterYear;
    const duesLabel = dues.notes || dues.period_name;
    const matchesPeriod = filterPeriod === 'all' || duesLabel === filterPeriod;
    const matchesSearch =
      dues.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dues.member_email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesYear && matchesPeriod && matchesSearch;
  });

  // Group filtered dues by member
  const memberGroups: MemberGroup[] = (() => {
    const groupMap = new Map<string, MemberGroup>();

    filteredDues.forEach(dues => {
      const key = dues.member_id || dues.member_email;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          memberId: key,
          memberName: dues.member_name,
          memberEmail: dues.member_email,
          memberYear: dues.member_year,
          dues: [],
          totalBalance: 0,
          allPaid: true,
          unpaidLabels: []
        });
      }
      const group = groupMap.get(key)!;
      group.dues.push(dues);
      group.totalBalance += dues.balance;
      if (dues.status !== 'paid' && dues.status !== 'waived') {
        group.allPaid = false;
        const label = dues.notes || dues.period_name || 'Dues';
        group.unpaidLabels.push(label);
      }
    });

    return Array.from(groupMap.values()).sort((a, b) =>
      a.memberName.localeCompare(b.memberName)
    );
  })();

  // Recompute stats from filtered view
  const displayStats = currentConfig
    ? computeStatsFromSummaries(filteredDues, currentConfig)
    : stats;

  const getDuesLabel = (dues: MemberDuesSummary) => dues.notes || dues.period_name || 'Dues';

  const getPlanMemberInfo = (plan: InstallmentPlanWithPayments) => {
    const dues = memberDues.find(d => d.id === plan.member_dues_id);
    return {
      memberName: dues?.member_name || 'Unknown',
      duesLabel: dues ? getDuesLabel(dues) : 'Unknown',
    };
  };

  const handleCancelPlan = async (planId: string) => {
    if (!window.confirm('Are you sure you want to cancel this payment plan? Remaining scheduled payments will be cancelled.')) {
      return;
    }
    setCancellingPlanId(planId);
    try {
      const result = await InstallmentService.cancelPlan(planId);
      if (result.success) {
        toast.success('Payment plan cancelled');
        loadData();
      } else {
        toast.error(result.error || 'Failed to cancel plan');
      }
    } catch (error) {
      console.error('Error cancelling plan:', error);
      toast.error('Failed to cancel plan');
    } finally {
      setCancellingPlanId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dues Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure and track member dues by year with automated late fees
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingConfig(currentConfig || undefined);
              setShowConfigModal(true);
            }}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1.5 text-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            {currentConfig ? 'Edit' : 'Setup'} Configuration
          </button>
          <button
            onClick={handleExport}
            disabled={memberDues.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stripe Connect Setup — collapsible */}
      <details className="bg-white rounded-lg shadow">
        <summary className="flex items-center justify-between px-6 py-4 cursor-pointer select-none hover:bg-gray-50 transition-colors rounded-lg">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <span className="text-base font-semibold text-gray-900">Online Payment Setup</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </summary>
        <div className="px-6 pb-5">
          <StripeConnectSetup chapterId={chapterId} onSetupComplete={loadData} />
        </div>
      </details>

      {/* Current Configuration Info */}
      {currentConfig && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Current Period: {currentConfig.period_name} {currentConfig.fiscal_year}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Due Date:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {currentConfig.due_date ? new Date(currentConfig.due_date).toLocaleDateString() : 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Late Fees:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {currentConfig.late_fee_enabled ?
                      `$${currentConfig.late_fee_amount}${currentConfig.late_fee_type === 'percentage' ? '%' : ''}` :
                      'Disabled'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Grace Period:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {currentConfig.late_fee_grace_days} days
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingConfig(currentConfig);
                setShowConfigModal(true);
              }}
              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      {displayStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Dues Records</p>
                <p className="text-3xl font-bold text-gray-900">{displayStats.total_members}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Payment Rate</p>
                <p className="text-3xl font-bold text-green-600">{displayStats.payment_rate}%</p>
                <p className="text-xs text-gray-500 mt-1">{displayStats.members_paid} paid</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Collected</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(displayStats.total_collected)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  of {formatCurrency(displayStats.total_expected)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(displayStats.total_outstanding)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{displayStats.members_overdue} overdue</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {currentConfig && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowBulkAssignModal(true)}
              disabled={isProcessing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Users className="w-4 h-4" />
              Bulk Assign Dues
            </button>
            <button
              onClick={() => setShowEmailAssignModal(true)}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign className="w-4 h-4" />
              Assign Dues
            </button>
            <button
              onClick={handleApplyLateFees}
              disabled={isProcessing || !currentConfig.late_fee_enabled}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AlertCircle className="w-4 h-4" />
              Apply Late Fees
            </button>
            <button
              onClick={() => setShowCustomLateFeeModal(true)}
              disabled={isProcessing}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign className="w-4 h-4" />
              Remove Processing Payments
            </button>
            <button
              onClick={loadData}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Years</option>
            {YEAR_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="waived">Waived</option>
          </select>
          {periodOptions.length > 1 && (
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Periods</option>
              {periodOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
          {(filterYear !== 'all' || filterStatus !== 'all' || filterPeriod !== 'all') && (
            <button
              onClick={() => {
                setFilterYear('all');
                setFilterStatus('all');
                setFilterPeriod('all');
              }}
              className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Member Dues Table — grouped by member */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-8 px-4 py-3"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unpaid Dues</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {memberGroups.map((group) => {
                const isExpanded = expandedMembers.has(group.memberId);
                return (
                  <React.Fragment key={group.memberId}>
                    {/* Member summary row */}
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpanded(group.memberId)}
                    >
                      <td className="px-4 py-4 text-gray-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{group.memberName}</div>
                        <div className="text-xs text-gray-500">{group.memberEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getYearLabel(group.memberYear)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {group.allPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3" />
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {group.allPaid ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {group.unpaidLabels.map((label, i) => (
                              <span
                                key={i}
                                className="inline-block px-2 py-0.5 text-xs rounded bg-red-50 text-red-700 border border-red-200"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {group.totalBalance > 0 ? (
                          <span className="text-red-600">{formatCurrency(group.totalBalance)}</span>
                        ) : (
                          <span className="text-green-600">{formatCurrency(0)}</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded detail rows */}
                    {isExpanded && group.dues.map((dues) => (
                      <tr key={dues.id} className="bg-gray-50 border-l-4 border-indigo-200">
                        <td></td>
                        <td className="px-6 py-3 text-sm text-gray-700" colSpan={1}>
                          <span className="font-medium">{getDuesLabel(dues)}</span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {formatCurrency(dues.total_amount)}
                          {dues.late_fee > 0 && (
                            <span className="text-red-500 text-xs ml-1">(+{formatCurrency(dues.late_fee)} late)</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          {dues.status === 'paid' || dues.status === 'waived' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3" />
                              {dues.status === 'waived' ? 'Waived' : 'Paid'}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-600">
                              {formatCurrency(dues.amount_paid)} / {formatCurrency(dues.total_amount)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          {dues.balance > 0 ? (
                            <span className="text-red-600 font-medium">{formatCurrency(dues.balance)}</span>
                          ) : (
                            <span className="text-green-600">{formatCurrency(0)}</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex gap-1.5">
                            <PayDuesButton
                              memberDues={dues}
                              onPaymentSuccess={loadData}
                              variant="small"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setInstallmentMemberDues(dues);
                                setShowInstallmentModal(true);
                              }}
                              disabled={dues.balance <= 0 || isDemo}
                              className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Configure installment payment eligibility"
                            >
                              <Calendar className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openPaymentModal(dues);
                              }}
                              disabled={dues.balance <= 0 || isDemo}
                              className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Record manual payment"
                            >
                              Record
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingDues(dues);
                                setShowEditDuesModal(true);
                              }}
                              disabled={isProcessing || isDemo}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Edit dues"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDues(dues);
                              }}
                              disabled={isProcessing || isDemo}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete dues"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {memberGroups.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {currentConfig ? 'No dues assigned yet. Click "Bulk Assign Dues" to get started.' : 'Please create a dues configuration first.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Active Payment Plans */}
      {activePlans.length > 0 && !isDemo && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Active Payment Plans
              <span className="text-sm font-normal text-gray-500">({activePlans.length})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dues</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Per Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activePlans.map((plan) => {
                  const { memberName, duesLabel } = getPlanMemberInfo(plan);
                  const completedPayments = plan.payments.filter(p => p.status === 'succeeded').length;
                  const progressPct = (completedPayments / plan.num_installments) * 100;

                  return (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {memberName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {duesLabel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{completedPayments}/{plan.num_installments}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(plan.installment_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {plan.next_payment_date
                          ? new Date(plan.next_payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(plan.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleCancelPlan(plan.id)}
                          disabled={cancellingPlanId === plan.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Cancel payment plan"
                        >
                          <XCircle className="w-3 h-3" />
                          {cancellingPlanId === plan.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      <DuesConfigurationModal
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false);
          setEditingConfig(undefined);
        }}
        chapterId={chapterId}
        existingConfig={editingConfig}
        onSaved={handleConfigSaved}
      />

      {/* Assign Dues Modal */}
      <AssignDuesModal
        isOpen={showEmailAssignModal}
        onClose={() => setShowEmailAssignModal(false)}
        chapterId={chapterId}
        config={currentConfig}
        onSuccess={loadData}
      />

      {/* Bulk Assign Dues Modal */}
      <BulkAssignDuesModal
        isOpen={showBulkAssignModal}
        onClose={() => setShowBulkAssignModal(false)}
        chapterId={chapterId}
        config={currentConfig}
        onSuccess={loadData}
      />

      {/* Payment Modal */}
      {showPaymentModal && selectedMemberDues && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Record Payment
            </h3>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Member:</p>
              <p className="font-medium text-gray-900">{selectedMemberDues.member_name}</p>
              <p className="text-sm text-gray-600 mt-1">Dues:</p>
              <p className="text-sm font-medium text-gray-900">{getDuesLabel(selectedMemberDues)}</p>
              <p className="text-sm text-gray-600 mt-2">Outstanding Balance:</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(selectedMemberDues.balance)}</p>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg"
                    min="0.01"
                    step="0.01"
                    max={selectedMemberDues.balance}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="ACH">ACH</option>
                  <option value="Venmo">Venmo</option>
                  <option value="Zelle">Zelle</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference # (optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Check #, Transaction ID, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    resetPaymentForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Installment Eligibility Modal */}
      {installmentMemberDues && (
        <InstallmentEligibilityModal
          isOpen={showInstallmentModal}
          onClose={() => {
            setShowInstallmentModal(false);
            setInstallmentMemberDues(null);
          }}
          memberDues={installmentMemberDues}
          chapterId={chapterId}
          onUpdate={loadData}
        />
      )}

      {/* Custom Late Fee Modal */}
      <ApplyCustomLateFeeModal
        isOpen={showCustomLateFeeModal}
        onClose={() => setShowCustomLateFeeModal(false)}
        chapterId={chapterId}
        memberDues={memberDues}
        onSuccess={loadData}
      />

      {/* Edit Dues Modal */}
      {editingDues && (
        <EditMemberDuesModal
          isOpen={showEditDuesModal}
          onClose={() => {
            setShowEditDuesModal(false);
            setEditingDues(null);
          }}
          memberDues={editingDues}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};

export default DuesManagementSection;
