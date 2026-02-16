import React, { useState, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { BudgetCategory, BudgetPeriod, Expense, ExpenseDetail } from '../services/types';
import { ExpenseService } from '../services/expenseService';
import toast from 'react-hot-toast';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  categories: BudgetCategory[];
  currentPeriod: BudgetPeriod | null;
  chapterId: string | null;
  existingExpense?: ExpenseDetail | null;
  mode?: 'create' | 'edit';
  preselectedCategoryId?: string;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  currentPeriod,
  chapterId,
  existingExpense = null,
  mode = 'create',
  preselectedCategoryId
}) => {
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    vendor: '',
    payment_method: 'Cash' as 'Cash' | 'Check' | 'Credit Card' | 'ACH' | 'Venmo' | 'Other',
    status: 'completed' as 'pending' | 'completed' | 'cancelled',
    notes: ''
  });

  const [budgetInfo, setBudgetInfo] = useState<{ allocated: number; spent: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryCreate, setShowCategoryCreate] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'Operational Costs' as 'Fixed Costs' | 'Operational Costs' | 'Event Costs',
    description: ''
  });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [localCategories, setLocalCategories] = useState<BudgetCategory[]>(categories);

  // Initialize form with existing expense data if editing
  useEffect(() => {
    if (mode === 'edit' && existingExpense) {
      setFormData({
        category_id: existingExpense.category_id,
        amount: existingExpense.amount.toString(),
        description: existingExpense.description,
        transaction_date: existingExpense.transaction_date,
        vendor: existingExpense.vendor || '',
        payment_method: (existingExpense.payment_method || 'Cash') as any,
        status: existingExpense.status,
        notes: existingExpense.notes || ''
      });
    } else if (mode === 'create') {
      // Reset form for new expense
      setFormData({
        category_id: preselectedCategoryId || '',
        amount: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
        vendor: '',
        payment_method: 'Cash',
        status: 'completed',
        notes: ''
      });
    }
  }, [mode, existingExpense, isOpen, preselectedCategoryId]);

  useEffect(() => {
    if (formData.category_id && currentPeriod) {
      loadBudgetInfo();
    }
  }, [formData.category_id, currentPeriod, chapterId]);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const loadBudgetInfo = async () => {
    if (!currentPeriod || !chapterId) return;

    try {
      const summary = await ExpenseService.getBudgetSummary(chapterId, currentPeriod.name);
      const category = localCategories.find(c => c.id === formData.category_id);
      const budgetItem = summary.find(s => s.category === category?.name);

      if (budgetItem) {
        setBudgetInfo({
          allocated: budgetItem.allocated,
          spent: budgetItem.spent
        });
      }
    } catch (error) {
      console.error('Error loading budget info:', error);
    }
  };

  const handleCreateCategory = async () => {
    if (!chapterId || !newCategory.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    setIsCreatingCategory(true);
    try {
      const created = await ExpenseService.addCategory(chapterId, {
        name: newCategory.name.trim(),
        type: newCategory.type,
        description: newCategory.description.trim() || null,
        is_active: true
      });

      // Add to local categories list
      setLocalCategories([...localCategories, created]);

      // Auto-select the new category
      setFormData({ ...formData, category_id: created.id });

      // Reset form and hide
      setNewCategory({ name: '', type: 'Operational Costs', description: '' });
      setShowCategoryCreate(false);

      toast.success('Category created successfully');

      // Refresh parent component's categories
      onSubmit();
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPeriod || !chapterId) {
      alert('No current period selected');
      return;
    }

    setIsSubmitting(true);

    try {
      const expenseData = {
        budget_id: null,
        category_id: formData.category_id,
        period_id: currentPeriod.id,
        amount: parseFloat(formData.amount),
        description: formData.description,
        transaction_date: formData.transaction_date,
        vendor: formData.vendor || null,
        receipt_url: null,
        payment_method: formData.payment_method as any,
        status: formData.status,
        source: 'MANUAL' as const,
        notes: formData.notes || null,
        created_by: null
      };

      if (mode === 'edit' && existingExpense) {
        await ExpenseService.updateExpense(existingExpense.id, expenseData);
      } else {
        await ExpenseService.addExpense(chapterId, expenseData);
      }

      // Call onSubmit callback to refresh data
      onSubmit();
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'edit' ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 [&>option]: [&>option]: [&>optgroup]: [&>optgroup]:"
              required
            >
              <option value="">Select a category</option>
              {['Fixed Costs', 'Operational Costs', 'Event Costs'].map(type => (
                <optgroup key={type} label={type}>
                  {localCategories
                    .filter(c => c.type === type)
                    .map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>

            {/* Create New Category Button/Form */}
            {!showCategoryCreate ? (
              <button
                type="button"
                onClick={() => setShowCategoryCreate(true)}
                className="mt-2 text-sm text-primary hover:text-primary-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Create new category
              </button>
            ) : (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Category name"
                    disabled={isCreatingCategory}
                  />
                  <select
                    value={newCategory.type}
                    onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value as any })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    disabled={isCreatingCategory}
                  >
                    <option value="Fixed Costs">Fixed Costs</option>
                    <option value="Operational Costs">Operational Costs</option>
                    <option value="Event Costs">Event Costs</option>
                  </select>
                  <input
                    type="text"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Description (optional)"
                    disabled={isCreatingCategory}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={isCreatingCategory || !newCategory.name.trim()}
                      className="flex-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      {isCreatingCategory ? (
                        'Creating...'
                      ) : (
                        <>
                          <Check className="w-3 h-3" />
                          Create
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryCreate(false);
                        setNewCategory({ name: '', type: 'Operational Costs', description: '' });
                      }}
                      disabled={isCreatingCategory}
                      className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {budgetInfo && (() => {
            const percentUsed = budgetInfo.allocated > 0
              ? (budgetInfo.spent / budgetInfo.allocated) * 100
              : 0;
            const remaining = budgetInfo.allocated - budgetInfo.spent;
            const isOverBudget = percentUsed > 100;
            const isNearLimit = percentUsed >= 80 && percentUsed <= 100;

            // Determine color scheme
            const colorClasses = isOverBudget
              ? 'bg-red-50 border-red-200'
              : isNearLimit
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-primary-50 border-primary-200';

            const textClasses = isOverBudget
              ? 'text-red-800'
              : isNearLimit
              ? 'text-yellow-800'
              : 'text-primary-800';

            const progressClasses = isOverBudget
              ? 'bg-red-600'
              : isNearLimit
              ? 'bg-yellow-600'
              : 'bg-primary';

            return (
              <div className={`p-3 rounded-lg border ${colorClasses}`}>
                {/* Warning/Alert Message */}
                {isOverBudget ? (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🔴</span>
                    <p className={`text-sm font-semibold ${textClasses}`}>
                      Alert: {Math.round(percentUsed - 100)}% over budget!
                    </p>
                  </div>
                ) : isNearLimit ? (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🟡</span>
                    <p className={`text-sm font-semibold ${textClasses}`}>
                      Warning: {Math.round(percentUsed)}% of budget used
                    </p>
                  </div>
                ) : (
                  <p className={`text-sm font-semibold ${textClasses} mb-2`}>
                    💰 Budget Status: {Math.round(percentUsed)}% used
                  </p>
                )}

                {/* Budget Details */}
                <div className={`text-sm ${textClasses} space-y-1`}>
                  <div className="flex justify-between">
                    <span>Budget:</span>
                    <span className="font-medium">${budgetInfo.allocated.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Spent:</span>
                    <span className="font-medium">${budgetInfo.spent.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isOverBudget ? 'Over by:' : 'Remaining:'}</span>
                    <span className="font-medium">
                      ${Math.abs(remaining).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${progressClasses}`}
                      style={{ width: `${Math.min(percentUsed, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs ${textClasses} mt-1 text-right`}>
                    {Math.round(percentUsed)}%
                  </p>
                </div>
              </div>
            );
          })()}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="What was this expense for?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor
            </label>
            <input
              type="text"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Where was this purchased?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 [&>option]: [&>option]:"
            >
              <option value="Cash">Cash</option>
              <option value="Check">Check</option>
              <option value="Credit Card">Credit Card</option>
              <option value="ACH">ACH</option>
              <option value="Venmo">Venmo</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 [&>option]: [&>option]:"
            >
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes or context..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseModal;
