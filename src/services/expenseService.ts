import { supabase } from './supabaseClient';
import {
  Expense,
  ExpenseDetail,
  BudgetCategory,
  BudgetPeriod,
  BudgetSummary
} from './types';
import { isDemoModeEnabled } from '../utils/env';
import { demoStore, demoHelpers } from '../demo/demoStore';

/**
 * Unified Expense Service
 *
 * This service handles all expense/transaction operations for the application.
 * It replaces the previous split between transactionService and expenseService.
 *
 * Features:
 * - Full CRUD operations on expenses
 * - Rich filtering and querying
 * - Integration with budget categories and periods
 * - CSV import/export support
 * - Real-time updates via Supabase subscriptions
 */
export class ExpenseService {

  // ============================================
  // EXPENSE CRUD OPERATIONS
  // ============================================

  /**
   * Get all expenses for a chapter with full details
   */
  static async getExpenses(
    chapterId: string,
    options?: {
      periodId?: string;
      categoryId?: string;
      startDate?: string;
      endDate?: string;
      status?: 'pending' | 'completed' | 'cancelled';
      limit?: number;
      includeIncome?: boolean; // Default false - exclude income/deposits from results
    }
  ): Promise<ExpenseDetail[]> {
    if (isDemoModeEnabled()) {
      const state = demoStore.getState();
      return state.expenses.filter(expense => {
        if (expense.chapter_id !== chapterId) return false;
        if (options?.periodId && expense.period_id !== options.periodId) return false;
        if (options?.categoryId && expense.category_id !== options.categoryId) return false;
        if (options?.status && expense.status !== options.status) return false;
        if (options?.startDate && expense.transaction_date < options.startDate) return false;
        if (options?.endDate && expense.transaction_date > options.endDate) return false;
        // Filter out income/deposits unless explicitly included
        if (!options?.includeIncome && expense.transaction_type === 'income') return false;
        return true;
      }).map(expense => ({ ...expense }));
    }

    if (!chapterId) {
      console.error('Chapter ID is required');
      return [];
    }

    try {
      let query = supabase
        .from('expense_details')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (options?.periodId) {
        query = query.eq('period_id', options.periodId);
      }

      if (options?.categoryId) {
        query = query.eq('category_id', options.categoryId);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.startDate) {
        query = query.gte('transaction_date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('transaction_date', options.endDate);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      // Filter out income/deposits unless explicitly included
      if (!options?.includeIncome) {
        query = query.neq('transaction_type', 'income');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching expenses:', error);
        return [];
      }

      return data as ExpenseDetail[];
    } catch (error) {
      console.error('Error in getExpenses:', error);
      return [];
    }
  }

  /**
   * Get a single expense by ID with full details
   */
  static async getExpense(id: string): Promise<ExpenseDetail | null> {
    if (isDemoModeEnabled()) {
      const state = demoStore.getState();
      return state.expenses.find(expense => expense.id === id) || null;
    }

    try {
      const { data, error } = await supabase
        .from('expense_details')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ExpenseDetail;
    } catch (error) {
      console.error('Error fetching expense:', error);
      return null;
    }
  }

  /**
   * Create a new expense
   */
  static async addExpense(chapterId: string, expense: Omit<Expense, 'id' | 'chapter_id' | 'created_at' | 'updated_at'>): Promise<Expense> {
    if (isDemoModeEnabled()) {
      const newExpense: ExpenseDetail = {
        ...(expense as ExpenseDetail),
        id: demoHelpers.nextId(),
        chapter_id: chapterId,
        category_name: 'Demo Category',
        category_type: 'Operations',
        period_name: 'FY25 – Spring',
        period_type: 'Semester',
        fiscal_year: 2025,
        budget_allocated: expense.amount * 2
      };
      demoStore.setState({ expenses: [newExpense, ...demoStore.getState().expenses] });
      return newExpense;
    }

    if (!chapterId) {
      throw new Error('Chapter ID is required');
    }

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...expense,
          chapter_id: chapterId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Expense;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  }

  /**
   * Bulk create expenses (useful for CSV import)
   */
  static async addExpenses(chapterId: string, expenses: Omit<Expense, 'id' | 'chapter_id' | 'created_at' | 'updated_at'>[]): Promise<Expense[]> {
    if (isDemoModeEnabled()) {
      const created: ExpenseDetail[] = expenses.map(exp => ({
        ...(exp as ExpenseDetail),
        id: demoHelpers.nextId(),
        chapter_id: chapterId,
        category_name: 'Demo Category',
        category_type: 'Operations',
        period_name: 'FY25 – Spring',
        period_type: 'Semester',
        fiscal_year: 2025,
        budget_allocated: exp.amount * 2
      }));
      demoStore.setState({ expenses: [...created, ...demoStore.getState().expenses] });
      return created;
    }

    if (!chapterId) {
      throw new Error('Chapter ID is required');
    }

    try {
      const expensesWithChapter = expenses.map(exp => ({
        ...exp,
        chapter_id: chapterId,
      }));

      const { data, error } = await supabase
        .from('expenses')
        .insert(expensesWithChapter)
        .select();

      if (error) throw error;
      return data as Expense[];
    } catch (error) {
      console.error('Error adding expenses:', error);
      throw error;
    }
  }

  /**
   * Update an existing expense
   */
  static async updateExpense(id: string, updates: Partial<Omit<Expense, 'id' | 'chapter_id' | 'created_at' | 'updated_at'>>): Promise<Expense> {
    if (isDemoModeEnabled()) {
      let updated: ExpenseDetail | undefined;
      demoStore.setState({
        expenses: demoStore.getState().expenses.map(expense => {
          if (expense.id !== id) return expense;
          updated = { ...expense, ...updates } as ExpenseDetail;
          return updated;
        })
      });
      if (!updated) {
        throw new Error('Expense not found');
      }
      return updated;
    }

    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Expense;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  /**
   * Delete an expense
   */
  static async deleteExpense(id: string): Promise<boolean> {
    if (isDemoModeEnabled()) {
      demoStore.setState({
        expenses: demoStore.getState().expenses.filter(expense => expense.id !== id)
      });
      return true;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  // ============================================
  // BUDGET CATEGORY OPERATIONS
  // ============================================

  /**
   * Get all active budget categories for a chapter
   */
  static async getCategories(chapterId: string): Promise<BudgetCategory[]> {
    if (isDemoModeEnabled()) {
      return demoStore.getState().budgetCategories.filter(cat => cat.chapter_id === chapterId).map(cat => ({ ...cat }));
    }

    if (!chapterId) {
      console.error('Chapter ID is required');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('is_active', true)
        .order('type')
        .order('name');

      if (error) {
        console.warn('Budget categories table not available:', error.message);
        return [];
      }

      return data as BudgetCategory[];
    } catch (error) {
      console.warn('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Create a new budget category
   */
  static async addCategory(chapterId: string, category: Omit<BudgetCategory, 'id' | 'chapter_id' | 'created_at' | 'updated_at'>): Promise<BudgetCategory> {
    if (isDemoModeEnabled()) {
      const newCategory: BudgetCategory = {
        id: demoHelpers.nextId(),
        chapter_id: chapterId,
        is_active: true,
        ...category
      };
      demoStore.setState({ budgetCategories: [newCategory, ...demoStore.getState().budgetCategories] });
      return newCategory;
    }

    if (!chapterId) {
      throw new Error('Chapter ID is required');
    }

    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .insert({
          ...category,
          chapter_id: chapterId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BudgetCategory;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }

  /**
   * Update a budget category
   */
  static async updateCategory(id: string, updates: Partial<Omit<BudgetCategory, 'id' | 'chapter_id' | 'created_at' | 'updated_at'>>): Promise<BudgetCategory> {
    if (isDemoModeEnabled()) {
      let updatedCategory: BudgetCategory | undefined;
      demoStore.setState({
        budgetCategories: demoStore.getState().budgetCategories.map(category => {
          if (category.id !== id) return category;
          updatedCategory = { ...category, ...updates } as BudgetCategory;
          return updatedCategory;
        })
      });
      if (!updatedCategory) {
        throw new Error('Budget category not found');
      }
      return updatedCategory;
    }

    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BudgetCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // ============================================
  // BUDGET PERIOD OPERATIONS
  // ============================================

  /**
   * Get all budget periods for a chapter
   */
  static async getPeriods(chapterId: string): Promise<BudgetPeriod[]> {
    if (isDemoModeEnabled()) {
      return demoStore.getState().budgetPeriods.filter(period => period.chapter_id === chapterId).map(period => ({ ...period }));
    }

    if (!chapterId) {
      console.error('Chapter ID is required');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('budget_periods')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('start_date', { ascending: false });

      if (error) {
        console.warn('Budget periods table not available:', error.message);
        return [];
      }

      return data as BudgetPeriod[];
    } catch (error) {
      console.warn('Error fetching periods:', error);
      return [];
    }
  }

  /**
   * Get the current budget period for a chapter
   */
  static async getCurrentPeriod(chapterId: string): Promise<BudgetPeriod | null> {
    if (isDemoModeEnabled()) {
      const period = demoStore.getState().budgetPeriods.find(p => p.chapter_id === chapterId && p.is_current);
      return period ? { ...period } : null;
    }

    if (!chapterId) {
      console.error('Chapter ID is required');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('budget_periods')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('is_current', true)
        .single();

      if (error) {
        console.warn('Current period not available:', error.message);
        return null;
      }

      return data as BudgetPeriod;
    } catch (error) {
      console.warn('Error fetching current period:', error);
      return null;
    }
  }

  /**
   * Create a new budget period
   */
  static async addPeriod(chapterId: string, period: Omit<BudgetPeriod, 'id' | 'chapter_id' | 'created_at'>): Promise<BudgetPeriod> {
    if (isDemoModeEnabled()) {
      const newPeriod: BudgetPeriod = {
        id: demoHelpers.nextId(),
        chapter_id: chapterId,
        ...period,
        created_at: new Date().toISOString()
      } as BudgetPeriod;
      demoStore.setState({ budgetPeriods: [newPeriod, ...demoStore.getState().budgetPeriods] });
      return newPeriod;
    }

    if (!chapterId) {
      throw new Error('Chapter ID is required');
    }

    try {
      const { data, error } = await supabase
        .from('budget_periods')
        .insert({
          ...period,
          chapter_id: chapterId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BudgetPeriod;
    } catch (error) {
      console.error('Error adding period:', error);
      throw error;
    }
  }

  // ============================================
  // BUDGET SUMMARY & ANALYTICS
  // ============================================

  /**
   * Get budget summary for a period
   */
  static async getBudgetSummary(chapterId: string, periodName?: string): Promise<BudgetSummary[]> {
    if (isDemoModeEnabled()) {
      return demoStore
        .getState()
        .budgetSummary.filter(summary => summary.chapter_id === chapterId && (!periodName || summary.period === periodName))
        .map(summary => ({ ...summary }));
    }

    if (!chapterId) {
      console.error('Chapter ID is required');
      return [];
    }

    try {
      let query = supabase
        .from('budget_summary')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('start_date', { ascending: false })
        .order('category_type')
        .order('category');

      if (periodName) {
        query = query.eq('period', periodName);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Budget summary view not available:', error.message);
        return [];
      }

      return data as BudgetSummary[];
    } catch (error) {
      console.warn('Error fetching budget summary:', error);
      return [];
    }
  }

  /**
   * Get spending totals by category type for a period.
   * Dynamically groups by whatever category_type values exist in the data.
   */
  static async getTotalsByPeriod(chapterId: string, periodName: string) {
    const emptyTotal = { allocated: 0, spent: 0, remaining: 0 };

    if (!chapterId) {
      console.warn('Chapter ID is required');
      return { 'Grand Total': { ...emptyTotal } } as Record<string, { allocated: number; spent: number; remaining: number }>;
    }

    try {
      const summaryData = await this.getBudgetSummary(chapterId, periodName);

      const totals: Record<string, { allocated: number; spent: number; remaining: number }> = {
        'Grand Total': { ...emptyTotal }
      };

      summaryData.forEach(item => {
        const key = item.category_type || 'Other';
        if (!totals[key]) {
          totals[key] = { ...emptyTotal };
        }
        totals[key].allocated += item.allocated;
        totals[key].spent += item.spent;
        totals[key].remaining += item.remaining;
        totals['Grand Total'].allocated += item.allocated;
        totals['Grand Total'].spent += item.spent;
        totals['Grand Total'].remaining += item.remaining;
      });

      return totals;
    } catch (error) {
      console.warn('Error fetching totals by period:', error);
      return { 'Grand Total': { ...emptyTotal } } as Record<string, { allocated: number; spent: number; remaining: number }>;
    }
  }

  /**
   * Get expense statistics for a period
   */
  static async getExpenseStats(chapterId: string, periodId?: string) {
    const expenses = await this.getExpenses(chapterId, { periodId });

    return {
      total: expenses.length,
      totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
      pending: expenses.filter(e => e.status === 'pending').length,
      completed: expenses.filter(e => e.status === 'completed').length,
      cancelled: expenses.filter(e => e.status === 'cancelled').length,
      averageAmount: expenses.length > 0
        ? expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length
        : 0,
      byCategory: expenses.reduce((acc, exp) => {
        if (!acc[exp.category_name]) {
          acc[exp.category_name] = { count: 0, total: 0 };
        }
        acc[exp.category_name].count++;
        acc[exp.category_name].total += exp.amount;
        return acc;
      }, {} as Record<string, { count: number; total: number }>),
    };
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Initialize default budget structure for a new chapter
   *
   * @deprecated This function is no longer used. Budget setup is now handled
   * through the BudgetSetupWizard component which provides a better user experience
   * with recommendations and customization options.
   */
  static async initializeChapterBudget(chapterId: string): Promise<void> {
    console.warn('initializeChapterBudget is deprecated. Use BudgetSetupWizard component instead.');

    // This function is kept for backwards compatibility but should not be used
    // Budget initialization is now handled through the UI wizard
    throw new Error('This function is deprecated. Please use the BudgetSetupWizard component.');
  }

  /**
   * Save a category rule so future transactions from this vendor auto-categorize
   */
  static async saveCategoryRule(
    chapterId: string,
    vendorName: string,
    categoryName: string,
    source: 'PLAID' | 'MANUAL' | 'CSV_IMPORT' | 'ALL' = 'ALL'
  ): Promise<boolean> {
    if (isDemoModeEnabled()) {
      return true;
    }

    try {
      const escapedName = vendorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = `(?i)(${escapedName})`;

      const { error } = await supabase
        .from('category_rules')
        .insert({
          chapter_id: chapterId,
          source,
          merchant_pattern: pattern,
          category: categoryName,
          priority: 500,
          is_active: true,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving category rule:', error);
      throw error;
    }
  }

  /**
   * Recategorize existing transactions by applying current category rules client-side.
   * Fetches category_rules, matches them against expense vendors, and batch-updates categories.
   */
  static async recategorizeTransactions(
    chapterId: string,
    options?: {
      recategorizeAll?: boolean;
      periodId?: string;
    }
  ): Promise<{
    success: boolean;
    processed: number;
    recategorized: number;
    unchanged: number;
    errors: string[];
  }> {
    if (isDemoModeEnabled()) {
      return { success: true, processed: 0, recategorized: 0, unchanged: 0, errors: [] };
    }

    // 1. Fetch active budget categories for this chapter (needed for both compound and DB rules)
    const { data: categories, error: catError } = await supabase
      .from('budget_categories')
      .select('id, name')
      .eq('chapter_id', chapterId)
      .eq('is_active', true);

    if (catError) throw new Error('Failed to fetch categories');
    const categoryMap = new Map((categories || []).map(c => [c.name, c.id]));

    // 2. Fetch active category rules for this chapter (and global rules)
    const { data: rules, error: rulesError } = await supabase
      .from('category_rules')
      .select('*')
      .or(`chapter_id.eq.${chapterId},chapter_id.is.null`)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (rulesError) throw new Error('Failed to fetch category rules');
    // Note: even with zero DB rules, compound rules still apply

    // 3. Fetch expenses to recategorize (include amount and payment_method for compound rules)
    let query = supabase
      .from('expense_details')
      .select('id, vendor, description, category_id, category_name, source, amount, payment_method')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (!options?.recategorizeAll) {
      // Only recategorize uncategorized expenses by default
      const uncategorizedId = categoryMap.get('Uncategorized');
      if (uncategorizedId) {
        query = query.eq('category_id', uncategorizedId);
      }
    }

    if (options?.periodId) {
      query = query.eq('period_id', options.periodId);
    }

    const { data: expenses, error: expError } = await query;
    if (expError) throw new Error('Failed to fetch expenses');
    if (!expenses || expenses.length === 0) {
      return { success: true, processed: 0, recategorized: 0, unchanged: 0, errors: [] };
    }

    // 4a. Merchant-based pattern rules (mirrors server-side MERCHANT_RULES)
    const MERCHANT_RULES: Array<[RegExp, string]> = [
      // ── National/IHQ Fees ──
      [/kappa\s*sigma/i, 'National/IHQ Fees'],
      [/endowment\s*fund/i, 'National/IHQ Fees'],
      [/fraternity\s*headquarters/i, 'National/IHQ Fees'],
      [/ihq|national\s*dues/i, 'National/IHQ Fees'],
      [/greek\s*life\s*office/i, 'National/IHQ Fees'],
      [/interfraternity\s*council|^ifc\b/i, 'National/IHQ Fees'],
      [/panhellenic/i, 'National/IHQ Fees'],
      [/npc\s*fees/i, 'National/IHQ Fees'],

      // ── Fines ──
      [/slo\s*city/i, 'Fines'],
      [/city\s*of\s*san\s*luis/i, 'Fines'],
      [/noise\s*violation/i, 'Fines'],
      [/code\s*enforcement/i, 'Fines'],
      [/municipal\s*court/i, 'Fines'],
      [/parking\s*citation/i, 'Fines'],

      // ── Insurance ──
      [/state\s*farm/i, 'Insurance'],
      [/geico/i, 'Insurance'],
      [/allstate/i, 'Insurance'],
      [/liberty\s*mutual/i, 'Insurance'],
      [/holmes\s*murphy/i, 'Insurance'],
      [/fraternal\s*insurance/i, 'Insurance'],
      [/mj\s*insurance/i, 'Insurance'],
      [/james\s*r\.\s*favor/i, 'Insurance'],
      [/greek\s*insurance/i, 'Insurance'],

      // ── Housing ──
      [/pg&?e|pacific\s*gas/i, 'Housing'],
      [/edison|southern\s*cal.*electric/i, 'Housing'],
      [/water\s*(?:bill|dept|utility|district)/i, 'Housing'],
      [/sewer/i, 'Housing'],
      [/garbage|waste\s*management|trash/i, 'Housing'],
      [/spectrum|comcast|xfinity|at&?t.*internet|frontier/i, 'Housing'],
      [/home\s*depot|lowe'?s|ace\s*hardware/i, 'Housing'],
      [/plumb|electrician|hvac|roofing|handyman/i, 'Housing'],
      [/campus\s*realty/i, 'Housing'],
      [/property\s*management/i, 'Housing'],
      [/rent|lease\s*payment/i, 'Housing'],
      [/cleaning\s*(?:service|crew|supplies)/i, 'Housing'],

      // ── Food/Meals ──
      [/chipotle/i, 'Food/Meals'],
      [/chick[\s-]*fil[\s-]*a/i, 'Food/Meals'],
      [/mcdonald'?s/i, 'Food/Meals'],
      [/taco\s*bell/i, 'Food/Meals'],
      [/wendy'?s/i, 'Food/Meals'],
      [/in[\s-]*n[\s-]*out/i, 'Food/Meals'],
      [/subway/i, 'Food/Meals'],
      [/panda\s*express/i, 'Food/Meals'],
      [/domino'?s|pizza\s*hut|papa\s*john'?s/i, 'Food/Meals'],
      [/doordash|uber\s*eats|grubhub|postmates/i, 'Food/Meals'],
      [/catering|cater/i, 'Food/Meals'],
      [/firestone\s*grill/i, 'Food/Meals'],
      [/splash\s*cafe/i, 'Food/Meals'],
      [/high\s*street\s*deli/i, 'Food/Meals'],
      [/woodstock'?s/i, 'Food/Meals'],
      [/campus\s*dining/i, 'Food/Meals'],
      [/sysco|us\s*foods|restaurant\s*depot/i, 'Food/Meals'],
      [/grocery|trader\s*joe'?s|vons|safeway|albertsons|ralph'?s/i, 'Food/Meals'],
      [/smart\s*&?\s*final/i, 'Food/Meals'],

      // ── Social ──
      [/party\s*(?:city|supply)/i, 'Social'],
      [/total\s*wine|bevmo/i, 'Social'],
      [/liquor/i, 'Social'],
      [/dj\s|disc\s*jockey|sound\s*system/i, 'Social'],
      [/event\s*(?:rental|supply|equipment)/i, 'Social'],
      [/photo\s*booth/i, 'Social'],
      [/ticketmaster|stubhub|axs\b/i, 'Social'],
      [/bowling|topgolf|dave\s*&?\s*buster/i, 'Social'],
      [/karaoke/i, 'Social'],
      [/uber(?!\s*eats)|lyft/i, 'Social'],
      [/limo|party\s*bus|charter\s*bus/i, 'Social'],

      // ── Rush/Recruitment ──
      [/rush\s*(?:week|event|supply|shirt|banner)/i, 'Rush/Recruitment'],
      [/vistaprint|custom\s*ink|sticker\s*mule/i, 'Rush/Recruitment'],
      [/banner|yard\s*sign|flyer|poster/i, 'Rush/Recruitment'],
      [/recruitment/i, 'Rush/Recruitment'],

      // ── Philanthropy ──
      [/united\s*way/i, 'Philanthropy'],
      [/habitat\s*for\s*humanity/i, 'Philanthropy'],
      [/st\.\s*jude|saint\s*jude/i, 'Philanthropy'],
      [/red\s*cross/i, 'Philanthropy'],
      [/special\s*olympics/i, 'Philanthropy'],
      [/boys\s*&?\s*girls\s*club/i, 'Philanthropy'],
      [/food\s*bank/i, 'Philanthropy'],
      [/make[\s-]*a[\s-]*wish/i, 'Philanthropy'],
      [/wounded\s*warrior/i, 'Philanthropy'],
      [/charity|charit\b|donation\s*to/i, 'Philanthropy'],

      // ── Operations ──
      [/staples|office\s*depot|office\s*max/i, 'Operations'],
      [/amazon(?!\s*prime\s*video)/i, 'Operations'],
      [/usps|ups\s*store|fedex/i, 'Operations'],
      [/google\s*workspace|microsoft\s*365|zoom\s*(?:video)?/i, 'Operations'],
      [/quickbooks|intuit/i, 'Operations'],
      [/venmo\s*fee|stripe\s*fee|paypal\s*fee|processing\s*fee/i, 'Operations'],
      [/canva/i, 'Operations'],
      [/adobe/i, 'Operations'],
      [/slack/i, 'Operations'],
      [/bank\s*(?:fee|charge|service)/i, 'Operations'],

      // ── Athletics/Intramurals ──
      [/intramural/i, 'Athletics/Intramurals'],
      [/dick'?s\s*sporting/i, 'Athletics/Intramurals'],
      [/rec\s*center|recreation\s*center/i, 'Athletics/Intramurals'],
      [/gym\s*membership|fitness/i, 'Athletics/Intramurals'],
      [/league\s*fee|ref(?:eree)?\s*fee/i, 'Athletics/Intramurals'],
      [/jersey|uniform\s*order/i, 'Athletics/Intramurals'],

      // ── Chapter Development ──
      [/leadership\s*(?:retreat|conference|academy)/i, 'Chapter Development'],
      [/conference\s*(?:fee|registration)/i, 'Chapter Development'],
      [/workshop/i, 'Chapter Development'],
      [/training\s*(?:program|seminar)/i, 'Chapter Development'],
      [/airbnb|vrbo|hotel|marriott|hilton|hyatt/i, 'Chapter Development'],
      [/southwest|american\s*airlines|united\s*airlines|delta\s*air/i, 'Chapter Development'],

      // ── Income: Member Dues ──
      [/dues\s*(?:payment|collection|deposit)/i, 'Member Dues'],

      // ── Income: Fundraising ──
      [/fundrais/i, 'Fundraising'],
      [/gofundme|givebutter/i, 'Fundraising'],
      [/car\s*wash\s*(?:proceeds|revenue)/i, 'Fundraising'],

      // ── Income: Alumni Donations ──
      [/alumni\s*(?:donation|gift|contrib)/i, 'Alumni Donations'],

      // ── Income: Event Ticket Sales ──
      [/ticket\s*(?:sale|revenue|proceed)/i, 'Event Ticket Sales'],
      [/formal\s*(?:ticket|revenue)/i, 'Event Ticket Sales'],
    ];

    // Compound rules (merchant + amount + payment method) — checked before merchant-only rules
    const tryCompoundRule = (
      merchantName: string,
      amount: number | null,
      paymentMethod: string | null
    ): string | null => {
      // Costco > $500 → Social (bulk event purchases)
      if (/costco/i.test(merchantName) && amount != null && Math.abs(amount) > 500) {
        return 'Social';
      }
      // Costco ≤ $500 → Food/Meals (regular grocery runs)
      if (/costco/i.test(merchantName) && amount != null && Math.abs(amount) <= 500) {
        return 'Food/Meals';
      }
      // Checks under $400 → Philanthropy
      if (
        paymentMethod?.toLowerCase() === 'check' &&
        amount != null &&
        Math.abs(amount) < 400
      ) {
        return 'Philanthropy';
      }

      // Merchant-only pattern rules
      for (const [regex, category] of MERCHANT_RULES) {
        if (regex.test(merchantName)) {
          return category;
        }
      }
      return null;
    };

    // 4b. Compile DB rule regexes once
    const compiledRules: Array<{ regex: RegExp; categoryId: string | null; source: string }> = [];
    for (const rule of rules) {
      try {
        const regex = new RegExp(rule.merchant_pattern, 'i');
        const categoryId = categoryMap.get(rule.category) || null;
        if (categoryId) {
          compiledRules.push({ regex, categoryId, source: rule.source });
        }
      } catch {
        // Skip invalid regex patterns
      }
    }

    // 5. Match expenses against compound rules first, then DB pattern rules
    const updates: Array<{ id: string; category_id: string }> = [];
    const errors: string[] = [];

    for (const expense of expenses) {
      const merchantName = expense.vendor || expense.description || '';
      if (!merchantName) continue;

      // Try compound rules first
      const compoundCategory = tryCompoundRule(
        merchantName,
        expense.amount ?? null,
        expense.payment_method ?? null
      );
      if (compoundCategory) {
        const compoundCategoryId = categoryMap.get(compoundCategory);
        if (compoundCategoryId && compoundCategoryId !== expense.category_id) {
          updates.push({ id: expense.id, category_id: compoundCategoryId });
        }
        continue; // Compound rule matched, skip DB rules
      }

      // Fall back to DB pattern rules
      for (const rule of compiledRules) {
        // Check source compatibility
        if (rule.source !== 'ALL' && rule.source !== expense.source) continue;

        if (rule.regex.test(merchantName) && rule.categoryId !== expense.category_id) {
          updates.push({ id: expense.id, category_id: rule.categoryId });
          break; // First match wins (rules are sorted by priority)
        }
      }
    }

    // 6. Batch update expenses
    let recategorized = 0;
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ category_id: update.category_id })
        .eq('id', update.id);

      if (updateError) {
        errors.push(`Failed to update expense ${update.id}`);
      } else {
        recategorized++;
      }
    }

    return {
      success: true,
      processed: expenses.length,
      recategorized,
      unchanged: expenses.length - updates.length,
      errors,
    };
  }

  /**
   * Get a summary of uncategorized transactions grouped by vendor.
   * Useful for identifying which vendors need category rules.
   */
  static async getUncategorizedVendors(chapterId: string): Promise<Array<{ vendor: string; count: number; descriptions: string[] }>> {
    const { data: categories } = await supabase
      .from('budget_categories')
      .select('id')
      .eq('chapter_id', chapterId)
      .eq('name', 'Uncategorized')
      .eq('is_active', true)
      .maybeSingle();

    if (!categories) return [];

    const { data: expenses, error } = await supabase
      .from('expense_details')
      .select('vendor, description')
      .eq('chapter_id', chapterId)
      .eq('category_id', categories.id)
      .order('vendor');

    if (error || !expenses) return [];

    const vendorMap = new Map<string, { count: number; descriptions: Set<string> }>();
    for (const exp of expenses) {
      const key = exp.vendor || exp.description || 'Unknown';
      const entry = vendorMap.get(key) || { count: 0, descriptions: new Set<string>() };
      entry.count++;
      if (exp.description) entry.descriptions.add(exp.description);
      vendorMap.set(key, entry);
    }

    return Array.from(vendorMap.entries())
      .map(([vendor, data]) => ({ vendor, count: data.count, descriptions: Array.from(data.descriptions).slice(0, 3) }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Seed category rules for common vendor patterns and immediately apply them.
   * Rules map vendor regex patterns to budget category names.
   */
  static async seedAndApplyRules(
    chapterId: string,
    rules: Array<{ pattern: string; category: string }>
  ): Promise<{ rulesCreated: number; recategorized: number }> {
    // Get existing category names for validation
    const { data: categories } = await supabase
      .from('budget_categories')
      .select('name')
      .eq('chapter_id', chapterId)
      .eq('is_active', true);

    const validCategories = new Set((categories || []).map(c => c.name));

    // Insert rules (skip ones targeting non-existent categories)
    let rulesCreated = 0;
    for (const rule of rules) {
      if (!validCategories.has(rule.category)) {
        console.warn(`Skipping rule: category "${rule.category}" not found`);
        continue;
      }

      const { error } = await supabase
        .from('category_rules')
        .insert({
          chapter_id: chapterId,
          source: 'ALL',
          merchant_pattern: rule.pattern,
          category: rule.category,
          priority: 500,
          is_active: true,
        });

      if (!error) rulesCreated++;
    }

    // Now apply
    const result = await this.recategorizeTransactions(chapterId, { recategorizeAll: true });

    return { rulesCreated, recategorized: result.recategorized };
  }

  /**
   * Check if a chapter has budget structure initialized
   */
  static async isBudgetInitialized(chapterId: string): Promise<boolean> {
    const [categories, periods] = await Promise.all([
      this.getCategories(chapterId),
      this.getPeriods(chapterId)
    ]);

    return categories.length > 0 && periods.length > 0;
  }
}
