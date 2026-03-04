import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useChapter } from '../context/ChapterContext';
import { useAuth } from '../context/AuthContext';
import { ReimbursementService } from '../services/reimbursementService';
import { ReimbursementRequestWithMember } from '../services/types';
import { ConfirmModal } from '../components/ConfirmModal';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | 'pending' | 'approved' | 'denied';

const Reimbursements: React.FC = () => {
  const { currentChapter } = useChapter();
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ReimbursementRequestWithMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Confirm modal state
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    action: 'approved' | 'denied';
    memberName: string;
    amount: number;
  } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (currentChapter?.id) {
      loadRequests();
    }
  }, [currentChapter?.id]);

  const loadRequests = async () => {
    if (!currentChapter?.id) return;
    setIsLoading(true);
    try {
      const data = await ReimbursementService.getChapterRequests(currentChapter.id);
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load reimbursement requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!confirmAction) return;
    setIsUpdating(true);
    try {
      await ReimbursementService.updateRequestStatus(
        confirmAction.id,
        confirmAction.action,
        adminNotes.trim() || undefined
      );
      toast.success(
        confirmAction.action === 'approved'
          ? `Marked as paid - $${confirmAction.amount.toFixed(2)} to ${confirmAction.memberName}`
          : 'Request denied'
      );
      setConfirmAction(null);
      setAdminNotes('');
      await loadRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await ReimbursementService.deleteRequest(deleteId);
      toast.success('Request deleted');
      setDeleteId(null);
      await loadRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        req.member_name.toLowerCase().includes(search) ||
        req.purchase_name.toLowerCase().includes(search) ||
        req.zelle_contact.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Stats
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const totalApprovedAmount = requests
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">Paid</span>;
      case 'denied':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">Denied</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Pending</span>;
    }
  };

  const statusTabs: { key: StatusFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'approved', label: 'Approved', count: approvedCount },
    { key: 'denied', label: 'Denied' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Reimbursements</h1>
        <p className="text-sm text-gray-500 mt-1">Review and manage member reimbursement requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Pending</h3>
          <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-sm text-gray-500 mt-2">Awaiting review</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Approved</h3>
          <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
          <p className="text-sm text-gray-500 mt-2">Marked as paid</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Total Paid</h3>
          <p className="text-3xl font-bold text-blue-600">${totalApprovedAmount.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-2">Total approved amount</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by member name, purchase, or Zelle contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zelle Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500/30 border-t-blue-500 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {requests.length === 0
                      ? 'No reimbursement requests yet.'
                      : 'No requests match your filters.'}
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {(req.member_name || 'U').charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{req.member_name}</div>
                          <div className="text-xs text-gray-500">{req.member_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{req.purchase_name}</div>
                      <div className="text-xs text-gray-500 max-w-xs truncate">{req.reason}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${Number(req.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(req.purchase_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{req.zelle_contact}</div>
                      <div className="text-xs text-gray-500 capitalize">{req.zelle_contact_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                      {req.admin_notes && (
                        <div className="text-xs text-gray-500 mt-1 max-w-[120px] truncate" title={req.admin_notes}>
                          {req.admin_notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() =>
                                setConfirmAction({
                                  id: req.id,
                                  action: 'approved',
                                  memberName: req.member_name,
                                  amount: Number(req.amount),
                                })
                              }
                              className="px-3 py-1.5 bg-green-100 text-green-800 hover:bg-green-200 rounded-lg transition-colors text-xs font-medium"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() =>
                                setConfirmAction({
                                  id: req.id,
                                  action: 'denied',
                                  memberName: req.member_name,
                                  amount: Number(req.amount),
                                })
                              }
                              className="px-3 py-1.5 bg-red-100 text-red-800 hover:bg-red-200 rounded-lg transition-colors text-xs font-medium"
                            >
                              Deny
                            </button>
                          </>
                        )}
                        {req.status !== 'pending' && req.reviewed_at && (
                          <span className="text-xs text-gray-400">
                            {new Date(req.reviewed_at).toLocaleDateString()}
                          </span>
                        )}
                        <button
                          onClick={() => setDeleteId(req.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Request"
        message="Are you sure you want to permanently delete this reimbursement request? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={isDeleting}
      />

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmAction.action === 'approved' ? 'Mark as Paid' : 'Deny Request'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {confirmAction.action === 'approved' ? (
                <>
                  Confirm that <strong>${confirmAction.amount.toFixed(2)}</strong> has been sent to{' '}
                  <strong>{confirmAction.memberName}</strong> via Zelle.
                </>
              ) : (
                <>
                  Deny reimbursement request from <strong>{confirmAction.memberName}</strong> for{' '}
                  <strong>${confirmAction.amount.toFixed(2)}</strong>.
                </>
              )}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes {confirmAction.action === 'denied' && '(recommended)'}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                rows={2}
                placeholder={
                  confirmAction.action === 'denied'
                    ? 'Reason for denial...'
                    : 'Optional notes...'
                }
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmAction(null);
                  setAdminNotes('');
                }}
                disabled={isUpdating}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={isUpdating}
                className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center ${
                  confirmAction.action === 'approved'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isUpdating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                ) : confirmAction.action === 'approved' ? (
                  'Confirm Paid'
                ) : (
                  'Deny Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reimbursements;
