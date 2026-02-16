import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Calendar,
  DollarSign,
  Repeat,
  AlertCircle,
  CheckCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
} from 'lucide-react';
import { RecurringTransactionDetail } from '../services/types';
import { RecurringService } from '../services/recurringService';
import { useChapter } from '../context/ChapterContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import RecurringTransactionModal from '../components/RecurringTransactionModal';
import { ConfirmModal } from '../components/ConfirmModal';
import toast from 'react-hot-toast';

const RecurringTransactions: React.FC = () => {
  const { currentChapter } = useChapter();
  const [transactions, setTransactions] = useState<RecurringTransactionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransactionDetail | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    if (!currentChapter?.id) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await RecurringService.getRecurringTransactions(currentChapter.id);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading recurring transactions:', error);
      toast.error('Failed to load recurring transactions');
    } finally {
      setLoading(false);
    }
  }, [currentChapter?.id]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleAdd = () => {
    setEditingTransaction(null);
    setShowModal(true);
  };

  const handleEdit = (transaction: RecurringTransactionDetail) => {
    setEditingTransaction(transaction);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      await RecurringService.deleteRecurringTransaction(deletingId);
      toast.success('Recurring transaction deleted');
      loadTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete recurring transaction');
    } finally {
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  };

  const handleToggleAutoPost = async (id: string, currentValue: boolean) => {
    try {
      await RecurringService.toggleAutoPost(id, !currentValue);
      toast.success(`Auto-post ${!currentValue ? 'enabled' : 'disabled'}`);
      loadTransactions();
    } catch (error) {
      console.error('Error toggling auto-post:', error);
      toast.error('Failed to toggle auto-post');
    }
  };

  const handleToggleActive = async (id: string, currentValue: boolean) => {
    try {
      await RecurringService.toggleActive(id, !currentValue);
      toast.success(`Recurring transaction ${!currentValue ? 'activated' : 'deactivated'}`);
      loadTransactions();
    } catch (error) {
      console.error('Error toggling active status:', error);
      toast.error('Failed to toggle active status');
    }
  };

  const handleProcessNow = async () => {
    if (!confirm('Process all due recurring transactions now? This will create actual transactions for any due items.')) {
      return;
    }

    setProcessing(true);
    try {
      const result = await RecurringService.processRecurringTransactions();
      if (result.success) {
        toast.success(`Processed ${result.result?.records_inserted || 0} recurring transactions`);
        loadTransactions();
      } else {
        toast.error(result.error || 'Failed to process recurring transactions');
      }
    } catch (error) {
      console.error('Error processing recurring transactions:', error);
      toast.error('Failed to process recurring transactions');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilDue = (dueDateString: string) => {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Recurring Transactions
          </h1>
          <p className="text-gray-500 mt-1">
            Manage automatic recurring income and expenses
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleProcessNow}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
            Process Now
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Recurring
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Recurring</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {transactions.filter(t => t.is_active).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Auto-Post Enabled</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {transactions.filter(t => t.auto_post && t.is_active).length}
              </p>
            </div>
            <PlayCircle className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Monthly</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(
                  transactions
                    .filter(t => t.is_active && t.frequency === 'monthly')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <Repeat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              No recurring transactions yet
            </p>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Add Your First Recurring Transaction
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Due
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => {
                  const daysUntilDue = getDaysUntilDue(transaction.next_due_date);
                  const isDue = daysUntilDue <= 0;
                  const isUpcoming = daysUntilDue > 0 && daysUntilDue <= 7;

                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.name}
                            </div>
                            {transaction.description && (
                              <div className="text-sm text-gray-500">
                                {transaction.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-medium ${
                            transaction.amount >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {RecurringService.formatFrequency(transaction.frequency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900">
                            {formatDate(transaction.next_due_date)}
                          </span>
                          <span
                            className={`text-xs ${
                              isDue
                                ? 'text-red-600'
                                : isUpcoming
                                ? 'text-yellow-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {isDue
                              ? 'Due now'
                              : daysUntilDue === 1
                              ? 'Tomorrow'
                              : `In ${daysUntilDue} days`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.category_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleToggleActive(transaction.id, transaction.is_active)}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                              transaction.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {transaction.is_active ? (
                              <>
                                <CheckCircle className="w-3 h-3" /> Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" /> Inactive
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleToggleAutoPost(transaction.id, transaction.auto_post)}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                              transaction.auto_post
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {transaction.auto_post ? (
                              <>
                                <PlayCircle className="w-3 h-3" /> Auto
                              </>
                            ) : (
                              <>
                                <PauseCircle className="w-3 h-3" /> Manual
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(transaction)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <RecurringTransactionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTransaction(null);
        }}
        onSave={loadTransactions}
        transaction={editingTransaction}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingId(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Recurring Transaction"
        message="Are you sure you want to delete this recurring transaction? This action cannot be undone."
      />
    </div>
  );
};

export default RecurringTransactions;
