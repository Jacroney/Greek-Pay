import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Users, GraduationCap, UserCheck, FileText, CheckSquare, Square, Tag } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { DuesConfiguration } from '../services/types';
import { YEAR_OPTIONS, DUES_FIELD_BY_YEAR, YearValue } from '../utils/yearUtils';
import { isDemoModeEnabled } from '../utils/env';
import { demoStore } from '../demo/demoStore';

// Year options for bulk assign - includes "All" option
const BULK_YEAR_OPTIONS = [
  { value: 'all', label: 'All Years' },
  ...YEAR_OPTIONS,
  { value: 'pledge', label: 'Pledge' },
];

// Status options
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active Members Only' },
  { value: 'inactive', label: 'Inactive Members Only' },
  { value: 'all', label: 'All Members' },
];

interface BulkAssignDuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  config: DuesConfiguration | null;
  onSuccess?: () => void;
}

interface MemberPreview {
  id: string;
  email: string;
  full_name: string;
  year: string | null;
  status: string;
}

const BulkAssignDuesModal: React.FC<BulkAssignDuesModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  config,
  onSuccess
}) => {
  const [duesType, setDuesType] = useState<'period' | 'event'>('period');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [amount, setAmount] = useState(config?.default_dues?.toString() || '');
  const [dueDate, setDueDate] = useState(config?.due_date || '');
  const [notes, setNotes] = useState('');
  const [eventLabel, setEventLabel] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<MemberPreview[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDuesType('period');
      setSelectedYear('all');
      setSelectedStatus('active');
      setAmount(config?.default_dues?.toString() || '');
      setDueDate(config?.due_date || '');
      setNotes('');
      setEventLabel('');
      setMembers([]);
      setSelectedMemberIds(new Set());
    }
  }, [isOpen, config]);

  // Auto-load members when year/status filters change
  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, selectedYear, selectedStatus, chapterId]);

  // Get amount for selected year from config
  const getAmountForYear = (year: string): number => {
    if (!config) return 0;
    if (year === 'all') return config.default_dues || 0;
    const field = DUES_FIELD_BY_YEAR[year as YearValue | 'pledge' | 'default'] || 'default_dues';
    return (config as any)[field] || config.default_dues || 0;
  };

  // Update amount when year changes
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (duesType === 'period') {
      const yearAmount = getAmountForYear(year);
      setAmount(yearAmount.toString());
    }
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
  };

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      if (isDemoModeEnabled()) {
        const demoMembers = demoStore.getState().members;
        let filtered = demoMembers;
        if (selectedYear !== 'all') {
          filtered = filtered.filter(m => m.year === selectedYear);
        }
        if (selectedStatus !== 'all') {
          filtered = filtered.filter(m => m.status?.toLowerCase() === selectedStatus);
        }
        const mapped = filtered.map(m => ({
          id: m.id,
          email: m.email,
          full_name: m.name,
          year: m.year,
          status: m.status || 'active'
        }));
        setMembers(mapped);
        setSelectedMemberIds(new Set(mapped.map(m => m.id)));
        return;
      }

      let query = supabase
        .from('user_profiles')
        .select('id, email, full_name, year, status')
        .eq('chapter_id', chapterId);

      if (selectedYear !== 'all') {
        query = query.eq('year', selectedYear);
      }
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query.order('full_name');
      if (error) throw error;

      const loaded = data || [];
      setMembers(loaded);
      setSelectedMemberIds(new Set(loaded.map(m => m.id)));
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedMemberIds(new Set(members.map(m => m.id)));
  };

  const deselectAll = () => {
    setSelectedMemberIds(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (duesType === 'period' && !config) {
      toast.error('Please create a dues configuration first');
      return;
    }

    if (duesType === 'event' && !eventLabel.trim()) {
      toast.error('Please enter an event label');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (selectedMemberIds.size === 0) {
      toast.error('Please select at least one member');
      return;
    }

    setIsProcessing(true);

    try {
      if (isDemoModeEnabled()) {
        toast.success(`Assigned dues to ${selectedMemberIds.size} members. (Demo)`);
        onSuccess?.();
        onClose();
        return;
      }

      const effectiveConfigId = duesType === 'event' ? null : config!.id;
      const effectiveNotes = duesType === 'event' ? eventLabel.trim() : (notes || null);

      const { data, error } = await supabase.rpc('bulk_assign_dues', {
        p_chapter_id: chapterId,
        p_config_id: effectiveConfigId,
        p_amount: parsedAmount,
        p_year_filter: null,
        p_status_filter: null,
        p_due_date: dueDate || null,
        p_member_ids: Array.from(selectedMemberIds),
        p_notes: effectiveNotes
      });

      if (error) {
        console.error('Error bulk assigning dues:', error);
        throw error;
      }

      const result = data || { assigned: 0, skipped: 0 };
      toast.success(`Assigned dues to ${result.assigned} members. Skipped ${result.skipped}.`);

      onSuccess?.();
      onClose();

    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      toast.error(error.message || 'Failed to assign dues');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const selectedCount = selectedMemberIds.size;
  const totalCount = members.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Bulk Assign Dues
          </h3>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* Dues Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Tag className="inline w-4 h-4 mr-1" />
                Dues Type
              </label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setDuesType('period');
                    if (config) {
                      setAmount(getAmountForYear(selectedYear).toString());
                      setDueDate(config.due_date || '');
                    }
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    duesType === 'period'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Period Dues
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDuesType('event');
                    setAmount('');
                    setDueDate('');
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    duesType === 'event'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Event / Custom
                </button>
              </div>
            </div>

            {/* Event Label (only for event/custom) */}
            {duesType === 'event' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="inline w-4 h-4 mr-1" />
                  Event Label *
                </label>
                <input
                  type="text"
                  value={eventLabel}
                  onChange={(e) => setEventLabel(e.target.value)}
                  required
                  placeholder="e.g. Vegas Formal, Spring Fundraiser"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Year Selection (period mode only) */}
            {duesType === 'period' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <GraduationCap className="inline w-4 h-4 mr-1" />
                  Member Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  {BULK_YEAR_OPTIONS.map((option) => {
                    const yearAmount = option.value === 'all' ? config?.default_dues : getAmountForYear(option.value);
                    return (
                      <option key={option.value} value={option.value}>
                        {option.label} {yearAmount ? `($${yearAmount.toFixed(2)})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Status Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <UserCheck className="inline w-4 h-4 mr-1" />
                Member Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Amount *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Notes / Label (period mode only — event mode uses eventLabel) */}
            {duesType === 'period' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="inline w-4 h-4 mr-1" />
                  Label / Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Spring 2026 Dues"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This label will appear on each member's dues record
                </p>
              </div>
            )}

            {/* Member List with Checkboxes */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {isLoading ? 'Loading...' : `${selectedCount} of ${totalCount} selected`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {members.length > 0 ? (
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {members.map((member) => {
                    const isSelected = selectedMemberIds.has(member.id);
                    return (
                      <label
                        key={member.id}
                        className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50"
                      >
                        <button
                          type="button"
                          onClick={() => toggleMember(member.id)}
                          className="flex-shrink-0 text-indigo-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-900 truncate block">
                            {member.full_name || member.email}
                          </span>
                        </div>
                        {member.year && (
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            Year {member.year}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  {isLoading ? 'Loading members...' : 'No members match the selected filters.'}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !amount || selectedCount === 0}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Assigning...' : `Assign to ${selectedCount} Member${selectedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkAssignDuesModal;
