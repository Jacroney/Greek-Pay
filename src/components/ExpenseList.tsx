import React, { useState, useRef, useEffect } from 'react';
import {
  Edit2,
  Trash2,
  FileText,
  DollarSign,
  Calendar,
  Tag,
  User,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Receipt,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { ExpenseDetail, BudgetCategory, BudgetPeriod } from '../services/types';
import { ExpenseService } from '../services/expenseService';
import ExpenseModal from './ExpenseModal';
import toast from 'react-hot-toast';

interface ExpenseListProps {
  expenses: ExpenseDetail[];
  onExpenseUpdated?: () => void;
  onExpenseDeleted?: () => void;
  showCategoryColumn?: boolean;
  showPeriodColumn?: boolean;
  showActions?: boolean;
  categories?: BudgetCategory[];
  currentPeriod?: BudgetPeriod | null;
  chapterId?: string | null;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onExpenseUpdated,
  onExpenseDeleted,
  showCategoryColumn = true,
  showPeriodColumn = true,
  showActions = true,
  categories = [],
  currentPeriod = null,
  chapterId = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof ExpenseDetail>('transaction_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseDetail | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [needsReviewFilter, setNeedsReviewFilter] = useState(false);
  const [categorizingId, setCategorizingId] = useState<string | null>(null);
  const [rulePromptExpense, setRulePromptExpense] = useState<{ id: string; vendor: string; categoryName: string } | null>(null);
  const [isRecategorizing, setIsRecategorizing] = useState(false);

  // Formatting helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Handle sorting
  const handleSort = (field: keyof ExpenseDetail) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: keyof ExpenseDetail) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="w-4 h-4 inline ml-1" /> :
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  // Count uncategorized
  const uncategorizedCount = expenses.filter(e => e.category_name === 'Uncategorized').length;

  // Group categories by expense_type for the inline dropdown
  const categoryGroups = React.useMemo(() => {
    const expenseCategories = categories.filter(c => c.category_usage_type !== 'income');
    const incomeCategories = categories.filter(c => c.category_usage_type === 'income' || c.category_usage_type === 'both');
    const groups = new Map<string, BudgetCategory[]>();
    expenseCategories.forEach(c => {
      const key = c.expense_type || c.type || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });
    return { groups, incomeCategories };
  }, [categories]);

  // Handle inline category change
  const handleInlineCategoryChange = async (expense: ExpenseDetail, newCategoryId: string) => {
    if (!newCategoryId || newCategoryId === expense.category_id) return;

    const selectedCategory = categories.find(c => c.id === newCategoryId);
    if (!selectedCategory) return;

    setCategorizingId(expense.id);
    try {
      await ExpenseService.updateExpense(expense.id, { category_id: newCategoryId });
      toast.success(`Categorized as "${selectedCategory.name}"`);

      // If expense has a vendor, prompt to save as rule
      if (expense.vendor) {
        setRulePromptExpense({
          id: expense.id,
          vendor: expense.vendor,
          categoryName: selectedCategory.name,
        });
      }

      onExpenseUpdated?.();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    } finally {
      setCategorizingId(null);
    }
  };

  // Handle saving a category rule
  const handleSaveRule = async () => {
    if (!rulePromptExpense || !chapterId) return;

    try {
      await ExpenseService.saveCategoryRule(
        chapterId,
        rulePromptExpense.vendor,
        rulePromptExpense.categoryName,
        'ALL'
      );
      toast.success(`Future "${rulePromptExpense.vendor}" transactions will auto-categorize as "${rulePromptExpense.categoryName}"`);
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Failed to save categorization rule');
    } finally {
      setRulePromptExpense(null);
    }
  };

  // Handle recategorize all transactions
  const handleRecategorizeAll = async () => {
    if (!chapterId) return;

    setIsRecategorizing(true);
    const toastId = toast.loading('Re-categorizing transactions...');
    try {
      const result = await ExpenseService.recategorizeTransactions(chapterId, {
        recategorizeAll: true,
      });

      if (result.recategorized > 0) {
        toast.success(
          `Re-categorized ${result.recategorized} of ${result.processed} transactions`,
          { id: toastId }
        );
        onExpenseUpdated?.();
      } else {
        toast.success('All transactions already have correct categories', { id: toastId });
      }
    } catch (error) {
      console.error('Recategorization error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to re-categorize', { id: toastId });
    } finally {
      setIsRecategorizing(false);
    }
  };

  // Filter and sort expenses
  const filteredAndSortedExpenses = expenses
    .filter(expense => {
      // Needs review filter
      if (needsReviewFilter && expense.category_name !== 'Uncategorized') return false;

      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        (expense.description?.toLowerCase() || '').includes(search) ||
        (expense.category_name?.toLowerCase() || '').includes(search) ||
        (expense.vendor?.toLowerCase() || '').includes(search) ||
        expense.amount.toString().includes(search)
      );
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  // Handle delete
  const handleDelete = async (id: string, description: string) => {
    if (!confirm(`Are you sure you want to delete "${description}"?`)) {
      return;
    }

    try {
      await ExpenseService.deleteExpense(id);
      toast.success('Expense deleted successfully');
      onExpenseDeleted?.();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  // Calculate totals
  const totals = {
    count: filteredAndSortedExpenses.length,
    total: filteredAndSortedExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    completed: filteredAndSortedExpenses.filter(e => e.status === 'completed').reduce((sum, exp) => sum + exp.amount, 0),
    pending: filteredAndSortedExpenses.filter(e => e.status === 'pending').reduce((sum, exp) => sum + exp.amount, 0),
  };

  // Calculate correct colspan based on visible columns
  const calculateColspan = () => {
    let cols = 5; // Base columns: Date, Description, Vendor, Amount, Status
    if (showCategoryColumn) cols++;
    if (showPeriodColumn) cols++;
    if (showActions) cols++;
    return cols;
  };

  const colspan = calculateColspan();

  const isUncategorized = (expense: ExpenseDetail) => expense.category_name === 'Uncategorized';

  // Inline category select rendered for uncategorized expenses
  const renderCategoryCell = (expense: ExpenseDetail) => {
    if (isUncategorized(expense) && showActions) {
      return (
        <td className="px-4 py-3 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
          <select
            value=""
            onChange={(e) => handleInlineCategoryChange(expense, e.target.value)}
            disabled={categorizingId === expense.id}
            className="w-full max-w-[180px] px-2 py-1.5 text-sm border border-amber-300 bg-amber-50 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
          >
            <option value="">Categorize...</option>
            {Array.from(categoryGroups.groups.entries()).map(([groupName, cats]) => (
              <optgroup key={groupName} label={groupName}>
                {cats.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </optgroup>
            ))}
            {categoryGroups.incomeCategories.length > 0 && (
              <optgroup label="Income">
                {categoryGroups.incomeCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </td>
      );
    }

    return (
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-full font-medium border border-blue-200">
          <Tag className="w-3 h-3" />
          {expense.category_name}
        </span>
      </td>
    );
  };

  // Mobile category for uncategorized
  const renderMobileCategoryBadge = (expense: ExpenseDetail) => {
    if (isUncategorized(expense) && showActions) {
      return (
        <select
          value=""
          onChange={(e) => handleInlineCategoryChange(expense, e.target.value)}
          disabled={categorizingId === expense.id}
          className="w-full px-2 py-1.5 text-xs border border-amber-300 bg-amber-50 rounded-lg focus:ring-2 focus:ring-primary"
        >
          <option value="">Categorize...</option>
          {Array.from(categoryGroups.groups.entries()).map(([groupName, cats]) => (
            <optgroup key={groupName} label={groupName}>
              {cats.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </optgroup>
          ))}
          {categoryGroups.incomeCategories.length > 0 && (
            <optgroup label="Income">
              {categoryGroups.incomeCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </optgroup>
          )}
        </select>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-gray-700">
        <Tag className="w-3 h-3" />
        {expense.category_name}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            {uncategorizedCount > 0 && (
              <>
                <button
                  onClick={() => setNeedsReviewFilter(!needsReviewFilter)}
                  className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    needsReviewFilter
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Needs Review
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                    needsReviewFilter ? 'bg-amber-200 text-amber-900' : 'bg-amber-200 text-amber-800'
                  }`}>
                    {uncategorizedCount}
                  </span>
                </button>
                {chapterId && showActions && (
                  <button
                    onClick={handleRecategorizeAll}
                    disabled={isRecategorizing}
                    className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRecategorizing ? 'animate-spin' : ''}`} />
                    Re-categorize All
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-700">{totals.count} expenses</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-900">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200/50 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-blue-700">Total</p>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-blue-900">{formatCurrency(totals.total)}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200/50 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-green-700">Completed</p>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xl font-bold text-green-900">{formatCurrency(totals.completed)}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200/50 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-yellow-700">Pending</p>
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-xl font-bold text-yellow-900">{formatCurrency(totals.pending)}</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200/50 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-700">Count</p>
              <Receipt className="w-4 h-4 text-gray-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{totals.count}</p>
          </div>
        </div>
      </div>

      {/* Save Rule Prompt */}
      {rulePromptExpense && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Tag className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-sm text-gray-700">
              Apply <span className="font-semibold">"{rulePromptExpense.categoryName}"</span> to all future{' '}
              <span className="font-semibold">"{rulePromptExpense.vendor}"</span> transactions?
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSaveRule}
              className="px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Yes, save rule
            </button>
            <button
              onClick={() => setRulePromptExpense(null)}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              No thanks
            </button>
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort('transaction_date')}
                >
                  <div className="flex items-center gap-1">
                    Date {getSortIcon('transaction_date')}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort('description')}
                >
                  <div className="flex items-center gap-1">
                    Description {getSortIcon('description')}
                  </div>
                </th>
                {showCategoryColumn && (
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('category_name')}
                  >
                    <div className="flex items-center gap-1">
                      Category {getSortIcon('category_name')}
                    </div>
                  </th>
                )}
                {showPeriodColumn && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Period
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Vendor
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-1">
                    Amount {getSortIcon('amount')}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                {showActions && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={colspan} className="px-4 py-8 text-center text-gray-500">
                    {needsReviewFilter
                      ? 'No uncategorized expenses. Nice work!'
                      : `No expenses found. ${searchTerm ? 'Try adjusting your search.' : ''}`
                    }
                  </td>
                </tr>
              ) : (
                filteredAndSortedExpenses.map((expense) => (
                  <React.Fragment key={expense.id}>
                    <tr
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                        isUncategorized(expense) ? 'bg-amber-50/40' : ''
                      }`}
                      onClick={() => setExpandedRow(expandedRow === expense.id ? null : expense.id)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(expense.transaction_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {expense.description}
                      </td>
                      {showCategoryColumn && renderCategoryCell(expense)}
                      {showPeriodColumn && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {expense.period_name}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {expense.vendor || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={getStatusBadge(expense.status)}>
                          {expense.status}
                        </span>
                      </td>
                      {showActions && (
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingExpense(expense);
                                setShowEditModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit expense"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(expense.id, expense.description);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Delete expense"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {/* Expanded Details Row */}
                    {expandedRow === expense.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={colspan} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 mb-1">Payment Method</p>
                              <p className="font-medium text-gray-900">{expense.payment_method || 'Not specified'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1">Category Type</p>
                              <p className="font-medium text-gray-900">{expense.category_type}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1">Source</p>
                              <p className="font-medium text-gray-900">{expense.source}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1">Budget Allocated</p>
                              <p className="font-medium text-gray-900">
                                {expense.budget_allocated ? formatCurrency(expense.budget_allocated) : 'No budget'}
                              </p>
                            </div>
                            {expense.notes && (
                              <div className="col-span-2 md:col-span-4">
                                <p className="text-gray-500 mb-1">Notes</p>
                                <p className="text-gray-900">{expense.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredAndSortedExpenses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            {needsReviewFilter
              ? 'No uncategorized expenses. Nice work!'
              : `No expenses found. ${searchTerm ? 'Try adjusting your search.' : ''}`
            }
          </div>
        ) : (
          filteredAndSortedExpenses.map((expense) => (
            <div
              key={expense.id}
              className={`bg-white rounded-lg shadow-sm p-4 ${
                isUncategorized(expense) ? 'border border-amber-200' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {expense.description}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {formatDate(expense.transaction_date)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 mb-1">
                    {formatCurrency(expense.amount)}
                  </div>
                  <span className={getStatusBadge(expense.status)}>
                    {expense.status}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs mt-3">
                {renderMobileCategoryBadge(expense)}
                {expense.vendor && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-gray-700">
                    <User className="w-3 h-3" />
                    {expense.vendor}
                  </span>
                )}
              </div>
              {showActions && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setEditingExpense(expense);
                      setShowEditModal(true);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id, expense.description)}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Expense Modal */}
      {showEditModal && editingExpense && (
        <ExpenseModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingExpense(null);
          }}
          onSubmit={() => {
            setShowEditModal(false);
            setEditingExpense(null);
            onExpenseUpdated?.();
          }}
          categories={categories}
          currentPeriod={currentPeriod}
          chapterId={chapterId}
          existingExpense={editingExpense}
          mode="edit"
        />
      )}
    </div>
  );
};

export default ExpenseList;
