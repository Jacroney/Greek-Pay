/**
 * Transaction Categorization Service
 *
 * Automatically categorizes transactions using:
 * 1. Pattern matching against category_rules table
 * 2. AI/LLM fallback for unmatched merchants
 * 3. Default "Uncategorized" category as final fallback
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface CategoryRule {
  id: string;
  chapter_id: string | null;
  source: 'PLAID' | 'MANUAL' | 'CSV_IMPORT' | 'ALL';
  merchant_pattern: string;
  category: string;
  priority: number;
  is_active: boolean;
}

export interface CategorizationResult {
  category_id: string;
  category_name: string;
  matched_by: 'plaid_category' | 'pattern' | 'ai' | 'uncategorized';
  confidence?: number;
  rule_id?: string;
}

export interface PlaidCategory {
  primary: string;
  detailed: string;
  confidence_level: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
}

export interface CategorizationOptions {
  merchantName: string;
  chapterId: string;
  source: 'PLAID' | 'MANUAL' | 'CSV_IMPORT';
  useAI?: boolean;
  availableCategories?: string[]; // For AI categorization
  plaidCategory?: PlaidCategory; // Plaid's personal_finance_category data
  amount?: number; // Transaction amount (positive) for amount-based rules
  paymentMethod?: string | null; // e.g. 'Check', 'ACH', 'Credit Card'
}

/**
 * Try to match using Plaid's personal_finance_category data
 * This provides high-quality categorization from Plaid's ML models
 */
async function tryPlaidCategoryMapping(
  supabase: SupabaseClient,
  chapterId: string,
  plaidCategory: PlaidCategory
): Promise<CategorizationResult | null> {
  try {
    // Fetch mappings - chapter-specific and global
    const { data: mappings, error: mappingsError } = await supabase
      .from('plaid_category_mappings')
      .select('*')
      .or(`chapter_id.eq.${chapterId},chapter_id.is.null`)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (mappingsError) {
      console.error('[Categorization] Error fetching Plaid mappings:', mappingsError);
      return null;
    }

    if (!mappings || mappings.length === 0) {
      console.log('[Categorization] No Plaid category mappings found');
      return null;
    }

    // Find best match: detailed match > primary-only match, chapter-specific > global
    const detailedChapterMatch = mappings.find((m: any) =>
      m.plaid_primary === plaidCategory.primary &&
      m.plaid_detailed === plaidCategory.detailed &&
      m.chapter_id === chapterId
    );

    const detailedGlobalMatch = mappings.find((m: any) =>
      m.plaid_primary === plaidCategory.primary &&
      m.plaid_detailed === plaidCategory.detailed &&
      m.chapter_id === null
    );

    const primaryChapterMatch = mappings.find((m: any) =>
      m.plaid_primary === plaidCategory.primary &&
      !m.plaid_detailed &&
      m.chapter_id === chapterId
    );

    const primaryGlobalMatch = mappings.find((m: any) =>
      m.plaid_primary === plaidCategory.primary &&
      !m.plaid_detailed &&
      m.chapter_id === null
    );

    const match = detailedChapterMatch || detailedGlobalMatch || primaryChapterMatch || primaryGlobalMatch;

    if (!match) {
      console.log(`[Categorization] No Plaid mapping found for: ${plaidCategory.primary}/${plaidCategory.detailed}`);
      return null;
    }

    console.log(`[Categorization] Plaid mapping found: ${plaidCategory.primary}/${plaidCategory.detailed} -> ${match.app_category}`);

    // Get category_id from budget_categories (case-insensitive match)
    const { data: category, error: categoryError } = await supabase
      .from('budget_categories')
      .select('id, name')
      .eq('chapter_id', chapterId)
      .ilike('name', match.app_category)
      .eq('is_active', true)
      .maybeSingle();

    if (categoryError || !category) {
      console.warn(`[Categorization] Category "${match.app_category}" not found for chapter ${chapterId}`);
      return null;
    }

    // Calculate confidence based on Plaid's confidence level
    const confidenceMap: Record<string, number> = {
      'VERY_HIGH': 0.95,
      'HIGH': 0.85,
      'MEDIUM': 0.70,
      'LOW': 0.50,
      'UNKNOWN': 0.40,
    };

    return {
      category_id: category.id,
      category_name: category.name,
      matched_by: 'plaid_category',
      confidence: confidenceMap[plaidCategory.confidence_level] || 0.50,
    };
  } catch (error) {
    console.error('[Categorization] Error in Plaid category mapping:', error);
    return null;
  }
}

/**
 * Main categorization function
 * Attempts Plaid category mapping first, then pattern matching, then AI fallback, then uncategorized
 */
export async function categorizeTransaction(
  supabase: SupabaseClient,
  options: CategorizationOptions
): Promise<CategorizationResult> {
  const { merchantName, chapterId, source, useAI = false, plaidCategory, amount, paymentMethod } = options;

  console.log(`[Categorization] Starting for merchant: "${merchantName}", source: ${source}, amount: ${amount}, method: ${paymentMethod}`);

  // Step 1: Try compound rules (merchant + amount + payment method)
  const compoundResult = await tryCompoundRules(supabase, merchantName, chapterId, amount, paymentMethod);
  if (compoundResult) {
    console.log(`[Categorization] Compound rule match found: ${compoundResult.category_name}`);
    return compoundResult;
  }

  // Step 2: Try Plaid category mapping (for Plaid transactions with category data)
  if (source === 'PLAID' && plaidCategory) {
    console.log(`[Categorization] Trying Plaid category: ${plaidCategory.primary}/${plaidCategory.detailed} (${plaidCategory.confidence_level})`);
    const plaidResult = await tryPlaidCategoryMapping(supabase, chapterId, plaidCategory);
    if (plaidResult) {
      console.log(`[Categorization] Plaid category match found: ${plaidResult.category_name}`);
      return plaidResult;
    }
  }

  // Step 3: Try pattern matching
  const patternResult = await tryPatternMatch(supabase, merchantName, chapterId, source);
  if (patternResult) {
    console.log(`[Categorization] Pattern match found: ${patternResult.category_name}`);
    return patternResult;
  }

  // Step 4: Try AI categorization if enabled
  if (useAI) {
    console.log('[Categorization] No pattern match, trying AI...');
    const aiResult = await tryAICategorization(supabase, merchantName, chapterId, options.availableCategories);
    if (aiResult) {
      console.log(`[Categorization] AI match found: ${aiResult.category_name}`);
      // Optionally: Save AI result as new rule for future use
      await saveAIResultAsRule(supabase, merchantName, chapterId, aiResult.category_name, source);
      return aiResult;
    }
  }

  // Step 5: Fallback to Uncategorized
  console.log('[Categorization] No match found, using Uncategorized');
  const uncategorizedResult = await getUncategorizedCategory(supabase, chapterId);
  return uncategorizedResult;
}

/**
 * Merchant-based pattern rules for automatic categorization.
 * Each entry: [regex pattern, target category name]
 * Checked in order — first match wins.
 */
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

  // ── Fines (city tickets, noise violations) ──
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

  // ── Social (events, parties, entertainment) ──
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

/**
 * Compound rules that use merchant name + amount + payment method together.
 * These encode chapter-specific business knowledge that simple regex patterns can't capture.
 *
 * Checked first (before merchant-only rules) because they are more specific.
 */
function matchCompoundRule(
  name: string,
  amount?: number,
  paymentMethod?: string | null
): string | null {
  // Costco > $500 → Social (bulk event purchases)
  if (/costco/i.test(name) && amount != null && amount > 500) {
    return 'Social';
  }
  // Costco ≤ $500 → Food/Meals (regular grocery runs)
  if (/costco/i.test(name) && amount != null && amount <= 500) {
    return 'Food/Meals';
  }
  // Checks under $400 → Philanthropy
  if (
    paymentMethod?.toLowerCase() === 'check' &&
    amount != null &&
    amount < 400
  ) {
    return 'Philanthropy';
  }
  return null;
}

/**
 * Try compound rules (merchant + amount + payment method) first,
 * then fall through to merchant-only pattern rules.
 */
async function tryCompoundRules(
  supabase: SupabaseClient,
  merchantName: string,
  chapterId: string,
  amount?: number,
  paymentMethod?: string | null
): Promise<CategorizationResult | null> {
  // 1. Compound rules (amount/payment-method dependent)
  let targetCategory = matchCompoundRule(merchantName, amount, paymentMethod);

  // 2. Merchant-only pattern rules
  if (!targetCategory) {
    for (const [regex, category] of MERCHANT_RULES) {
      if (regex.test(merchantName)) {
        targetCategory = category;
        break;
      }
    }
  }

  if (!targetCategory) return null;

  // Resolve category name to category_id
  const { data: category, error } = await supabase
    .from('budget_categories')
    .select('id, name')
    .eq('chapter_id', chapterId)
    .ilike('name', targetCategory)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !category) {
    console.warn(`[Categorization] Compound rule target "${targetCategory}" not found for chapter ${chapterId}`);
    return null;
  }

  console.log(`[Categorization] Compound rule matched: "${merchantName}" (amount=${amount}, method=${paymentMethod}) -> ${category.name}`);
  return {
    category_id: category.id,
    category_name: category.name,
    matched_by: 'pattern',
    confidence: 0.90,
  };
}

/**
 * Try to match merchant name against category rules
 * Rules are checked in priority order (highest first)
 */
async function tryPatternMatch(
  supabase: SupabaseClient,
  merchantName: string,
  chapterId: string,
  source: string
): Promise<CategorizationResult | null> {
  try {
    // Fetch rules for this chapter and global rules
    // Source-specific rules OR rules that apply to ALL sources
    const { data: rules, error: rulesError } = await supabase
      .from('category_rules')
      .select('*')
      .or(`chapter_id.eq.${chapterId},chapter_id.is.null`)
      .or(`source.eq.${source},source.eq.ALL`)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (rulesError) {
      console.error('[Categorization] Error fetching rules:', rulesError);
      return null;
    }

    if (!rules || rules.length === 0) {
      console.log('[Categorization] No rules found');
      return null;
    }

    // Test each rule's pattern against merchant name
    for (const rule of rules) {
      try {
        const regex = new RegExp(rule.merchant_pattern, 'i'); // Case-insensitive
        if (regex.test(merchantName)) {
          console.log(`[Categorization] Pattern matched: "${rule.merchant_pattern}" -> ${rule.category}`);

          // Find the category_id for this category name
          const { data: category, error: categoryError } = await supabase
            .from('budget_categories')
            .select('id, name')
            .eq('chapter_id', chapterId)
            .eq('name', rule.category)
            .eq('is_active', true)
            .single();

          if (categoryError || !category) {
            console.warn(`[Categorization] Category "${rule.category}" not found for chapter ${chapterId}`);
            continue; // Try next rule
          }

          return {
            category_id: category.id,
            category_name: category.name,
            matched_by: 'pattern',
            rule_id: rule.id,
          };
        }
      } catch (regexError) {
        console.error(`[Categorization] Invalid regex pattern: ${rule.merchant_pattern}`, regexError);
        continue;
      }
    }

    return null; // No pattern matched
  } catch (error) {
    console.error('[Categorization] Error in pattern matching:', error);
    return null;
  }
}

/**
 * Use AI/LLM to categorize transaction
 * This is a placeholder that will be implemented with OpenAI integration
 */
async function tryAICategorization(
  supabase: SupabaseClient,
  merchantName: string,
  chapterId: string,
  availableCategories?: string[]
): Promise<CategorizationResult | null> {
  try {
    // Get available categories for this chapter if not provided
    let categories = availableCategories;
    if (!categories) {
      const { data: categoryData, error: categoryError } = await supabase
        .from('budget_categories')
        .select('name')
        .eq('chapter_id', chapterId)
        .eq('is_active', true);

      if (categoryError || !categoryData) {
        console.error('[Categorization] Error fetching categories for AI:', categoryError);
        return null;
      }

      categories = categoryData.map((c: any) => c.name);
    }

    // Call OpenAI API to categorize
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.warn('[Categorization] OpenAI API key not configured');
      return null;
    }

    const prompt = `You are a financial categorization assistant. Given a merchant name and a list of available categories, determine the most appropriate category.

Merchant: "${merchantName}"

Available categories:
${categories.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Respond with ONLY the category name from the list above that best matches this merchant. If none match well, respond with "Uncategorized".`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cost-effective
        messages: [
          { role: 'system', content: 'You are a financial categorization expert. Respond only with the category name.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      console.error('[Categorization] OpenAI API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    const categoryName = data.choices[0]?.message?.content?.trim();

    if (!categoryName || categoryName === 'Uncategorized') {
      console.log('[Categorization] AI returned no match');
      return null;
    }

    // Verify the category exists and get its ID
    const { data: category, error: categoryError } = await supabase
      .from('budget_categories')
      .select('id, name')
      .eq('chapter_id', chapterId)
      .eq('name', categoryName)
      .eq('is_active', true)
      .single();

    if (categoryError || !category) {
      console.warn(`[Categorization] AI suggested category "${categoryName}" not found`);
      return null;
    }

    console.log(`[Categorization] AI categorized as: ${categoryName}`);
    return {
      category_id: category.id,
      category_name: category.name,
      matched_by: 'ai',
      confidence: 0.8, // Could extract from OpenAI response
    };
  } catch (error) {
    console.error('[Categorization] Error in AI categorization:', error);
    return null;
  }
}

/**
 * Save AI categorization result as a new rule for future use
 * This allows the system to "learn" from AI categorizations
 */
async function saveAIResultAsRule(
  supabase: SupabaseClient,
  merchantName: string,
  chapterId: string,
  categoryName: string,
  source: string
): Promise<void> {
  try {
    // Create a simple pattern from merchant name (escape special regex chars)
    const escapedName = merchantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = `(?i)(${escapedName})`;

    // Insert new rule with medium priority (500)
    const { error } = await supabase
      .from('category_rules')
      .insert({
        chapter_id: chapterId,
        source: source,
        merchant_pattern: pattern,
        category: categoryName,
        priority: 500, // Medium priority (AI-learned rules)
        is_active: true,
      });

    if (error) {
      console.error('[Categorization] Error saving AI result as rule:', error);
    } else {
      console.log(`[Categorization] Saved new rule: "${pattern}" -> ${categoryName}`);
    }
  } catch (error) {
    console.error('[Categorization] Error in saveAIResultAsRule:', error);
  }
}

/**
 * Get or create the "Uncategorized" category for a chapter
 * This is the final fallback when no other categorization works
 */
async function getUncategorizedCategory(
  supabase: SupabaseClient,
  chapterId: string
): Promise<CategorizationResult> {
  try {
    // Try to find existing Uncategorized category
    let { data: category, error: findError } = await supabase
      .from('budget_categories')
      .select('id, name')
      .eq('chapter_id', chapterId)
      .eq('name', 'Uncategorized')
      .eq('is_active', true)
      .maybeSingle();

    // If not found, create it
    if (!category && !findError) {
      console.log('[Categorization] Creating Uncategorized category');

      const { data: newCategory, error: createError } = await supabase
        .from('budget_categories')
        .insert({
          chapter_id: chapterId,
          name: 'Uncategorized',
          type: 'Operations',
          expense_type: 'Operations',
          category_usage_type: 'both',
          description: 'Transactions that could not be automatically categorized',
          is_active: true,
        })
        .select('id, name')
        .single();

      if (createError || !newCategory) {
        throw new Error(`Failed to create Uncategorized category: ${createError?.message}`);
      }

      category = newCategory;
    }

    if (findError && findError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw findError;
    }

    if (!category) {
      throw new Error('Could not find or create Uncategorized category');
    }

    return {
      category_id: category.id,
      category_name: category.name,
      matched_by: 'uncategorized',
    };
  } catch (error) {
    console.error('[Categorization] Error getting Uncategorized category:', error);
    throw error;
  }
}

/**
 * Bulk categorize multiple transactions
 * More efficient for batch operations like CSV import
 */
export async function categorizeBatch(
  supabase: SupabaseClient,
  transactions: Array<{
    merchantName: string;
    transactionId?: string;
    amount?: number;
    paymentMethod?: string | null;
  }>,
  chapterId: string,
  source: 'PLAID' | 'MANUAL' | 'CSV_IMPORT',
  useAI: boolean = false
): Promise<Map<string, CategorizationResult>> {
  const results = new Map<string, CategorizationResult>();

  // Get all categories once for efficiency
  const { data: categories } = await supabase
    .from('budget_categories')
    .select('name')
    .eq('chapter_id', chapterId)
    .eq('is_active', true);

  const availableCategories = categories?.map((c: any) => c.name) || [];

  // Process each transaction
  for (const transaction of transactions) {
    try {
      const result = await categorizeTransaction(supabase, {
        merchantName: transaction.merchantName,
        chapterId,
        source,
        amount: transaction.amount,
        paymentMethod: transaction.paymentMethod,
        useAI,
        availableCategories,
      });

      const key = transaction.transactionId || transaction.merchantName;
      results.set(key, result);
    } catch (error) {
      console.error(`[Categorization] Error categorizing ${transaction.merchantName}:`, error);
    }
  }

  return results;
}
