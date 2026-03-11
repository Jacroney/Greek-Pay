import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ExpenseService } from './services/expenseService'
import { supabase } from './services/supabaseClient'

// Temporary admin helpers — run from browser console
window.__admin = {
  dumpVendors: (chapterId) => ExpenseService.getUncategorizedVendors(chapterId),
  seedRules: (chapterId, rules) => ExpenseService.seedAndApplyRules(chapterId, rules),
  recategorize: (chapterId) => ExpenseService.recategorizeTransactions(chapterId, { recategorizeAll: true }),
  getCategories: async (chapterId) => {
    const { data } = await supabase
      .from('budget_categories')
      .select('id, name, type, expense_type, income_type, category_usage_type')
      .eq('chapter_id', chapterId)
      .eq('is_active', true)
      .order('name');
    return data;
  },
  getRules: async (chapterId) => {
    const { data } = await supabase
      .from('category_rules')
      .select('id, merchant_pattern, category, source, priority, is_active')
      .or(`chapter_id.eq.${chapterId},chapter_id.is.null`)
      .eq('is_active', true)
      .order('priority', { ascending: false });
    return data;
  },
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
