import React, { useState, useEffect } from 'react';
import { X, Receipt, DollarSign, Calendar, Phone, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChapter } from '../context/ChapterContext';
import { ReimbursementService } from '../services/reimbursementService';
import { ReimbursementRequest } from '../services/types';
import toast from 'react-hot-toast';

interface ReimbursementRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ReimbursementRequestModal: React.FC<ReimbursementRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const { currentChapter } = useChapter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<ReimbursementRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [formData, setFormData] = useState({
    purchase_name: '',
    reason: '',
    amount: '',
    purchase_date: '',
    zelle_contact: '',
    zelle_contact_type: 'email' as 'phone' | 'email',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        purchase_name: '',
        reason: '',
        amount: '',
        purchase_date: '',
        zelle_contact: '',
        zelle_contact_type: 'email',
      });
      loadMyRequests();
    }
  }, [isOpen]);

  const loadMyRequests = async () => {
    setLoadingRequests(true);
    try {
      const requests = await ReimbursementService.getMyRequests();
      setMyRequests(requests);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !currentChapter?.id) return;

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await ReimbursementService.createRequest({
        chapter_id: currentChapter.id,
        member_id: profile.id,
        purchase_name: formData.purchase_name.trim(),
        reason: formData.reason.trim(),
        amount,
        purchase_date: formData.purchase_date,
        zelle_contact: formData.zelle_contact.trim(),
        zelle_contact_type: formData.zelle_contact_type,
      });

      toast.success('Reimbursement request submitted!');
      setFormData({
        purchase_name: '',
        reason: '',
        amount: '',
        purchase_date: '',
        zelle_contact: '',
        zelle_contact_type: 'email',
      });
      await loadMyRequests();
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">Approved</span>;
      case 'denied':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">Denied</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Pending</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-slideUp sm:animate-none">
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="border-b border-[var(--brand-border)] px-6 py-5 sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)]">
                <Receipt className="w-5 h-5 text-[var(--brand-primary)]" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-[var(--brand-text)]">
                Request Reimbursement
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors active:scale-95 touch-manipulation"
              disabled={isSubmitting}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Purchase Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Purchase Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.purchase_name}
              onChange={(e) => setFormData({ ...formData, purchase_name: e.target.value })}
              className="w-full px-3 py-2.5 border border-[var(--brand-border)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              placeholder="e.g., Event supplies, printing costs"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2.5 border border-[var(--brand-border)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-none"
              placeholder="Describe why this purchase was made..."
              rows={3}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Amount and Date row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 border border-[var(--brand-border)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  placeholder="0.00"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 border border-[var(--brand-border)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Zelle Contact Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zelle Contact Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="zelle_contact_type"
                  value="email"
                  checked={formData.zelle_contact_type === 'email'}
                  onChange={() => setFormData({ ...formData, zelle_contact_type: 'email' })}
                  className="text-blue-600 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="zelle_contact_type"
                  value="phone"
                  checked={formData.zelle_contact_type === 'phone'}
                  onChange={() => setFormData({ ...formData, zelle_contact_type: 'phone' })}
                  className="text-blue-600 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Phone</span>
              </label>
            </div>
          </div>

          {/* Zelle Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zelle {formData.zelle_contact_type === 'email' ? 'Email' : 'Phone Number'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                {formData.zelle_contact_type === 'email' ? (
                  <Mail className="w-4 h-4 text-gray-400" />
                ) : (
                  <Phone className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <input
                type={formData.zelle_contact_type === 'email' ? 'email' : 'tel'}
                value={formData.zelle_contact}
                onChange={(e) => setFormData({ ...formData, zelle_contact: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 border border-[var(--brand-border)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                placeholder={formData.zelle_contact_type === 'email' ? 'zelle@example.com' : '(555) 123-4567'}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none touch-manipulation font-semibold flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>

        {/* Past Requests */}
        {myRequests.length > 0 && (
          <div className="border-t border-gray-200 px-5 sm:px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Past Requests</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {myRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{req.purchase_name}</p>
                    <p className="text-xs text-gray-500">
                      ${Number(req.amount).toFixed(2)} &middot; {new Date(req.purchase_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    {getStatusBadge(req.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingRequests && myRequests.length === 0 && (
          <div className="border-t border-gray-200 px-5 sm:px-6 py-4 text-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500/30 border-t-blue-500 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReimbursementRequestModal;
