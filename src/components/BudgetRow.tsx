import React from 'react';
import { ChevronRight } from 'lucide-react';
import { BudgetSummary } from '../services/types';

interface BudgetRowProps {
  budget: BudgetSummary;
  onClick?: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const getBarColor = (percent: number) => {
  if (percent > 100) return 'bg-red-500';
  if (percent > 80) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const BudgetRow: React.FC<BudgetRowProps> = ({ budget, onClick }) => {
  const isOverBudget = budget.remaining < 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full grid grid-cols-[1fr_auto] md:grid-cols-[1fr_minmax(120px,200px)_auto_auto_auto_24px] items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150 group"
    >
      {/* Category name */}
      <span className="text-sm font-medium text-gray-900 truncate">
        {budget.category}
      </span>

      {/* Progress bar — hidden on mobile */}
      <div className="hidden md:block">
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div
            className={`h-1.5 rounded-full ${getBarColor(budget.percent_used)} transition-all duration-300`}
            style={{ width: `${Math.min(budget.percent_used, 100)}%` }}
          />
        </div>
      </div>

      {/* Spent of allocated */}
      <span className="text-sm tabular-nums text-gray-900">
        {formatCurrency(budget.spent)}
        <span className="text-gray-400"> of {formatCurrency(budget.allocated)}</span>
      </span>

      {/* Remaining — hidden on mobile */}
      <span
        className={`hidden md:inline text-sm tabular-nums font-medium ${
          isOverBudget ? 'text-red-600' : 'text-gray-500'
        }`}
      >
        {isOverBudget ? '-' : ''}
        {formatCurrency(Math.abs(budget.remaining))}
      </span>

      {/* Percent */}
      <span
        className={`hidden md:inline text-xs tabular-nums font-medium ${
          budget.percent_used > 100
            ? 'text-red-600'
            : budget.percent_used > 80
              ? 'text-amber-600'
              : 'text-gray-400'
        }`}
      >
        {Math.round(budget.percent_used)}%
      </span>

      {/* Chevron */}
      <ChevronRight className="hidden md:block w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
    </button>
  );
};

export default BudgetRow;
