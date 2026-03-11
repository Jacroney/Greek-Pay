import type { ExpenseCategoryType, IncomeCategoryType } from '../services/types';

export const EXPENSE_CATEGORY_TYPES: ExpenseCategoryType[] = [
  'Housing',
  'Social',
  'Philanthropy',
  'Rush/Recruitment',
  'Operations',
  'Insurance',
  'National/IHQ Fees',
  'Food/Meals',
  'Athletics/Intramurals',
  'Chapter Development',
];

export const INCOME_CATEGORY_TYPES: IncomeCategoryType[] = [
  'Member Dues',
  'New Member Fees',
  'Fundraising',
  'Alumni Donations',
  'Fines',
  'Event Ticket Sales',
  'Sponsorships',
  'Interest/Returns',
];

export const CATEGORY_TYPE_METADATA: Record<string, { description: string; icon?: string }> = {
  // Expense types
  'Housing': { description: 'Rent, utilities, maintenance, and housing-related costs' },
  'Social': { description: 'Parties, mixers, date nights, and social events' },
  'Philanthropy': { description: 'Fundraising events, charitable donations, and community service' },
  'Rush/Recruitment': { description: 'Rush week events, recruitment marketing, and new member activities' },
  'Operations': { description: 'Office supplies, software, administrative costs, and general operations' },
  'Insurance': { description: 'Liability, property, and event insurance premiums' },
  'National/IHQ Fees': { description: 'National headquarters dues, IFC fees, and organizational fees' },
  'Food/Meals': { description: 'Chapter meals, catering, kitchen supplies, and food service' },
  'Athletics/Intramurals': { description: 'Intramural sports, gym memberships, and athletic equipment' },
  'Chapter Development': { description: 'Leadership retreats, conferences, training, and educational programs' },

  // Income types
  'Member Dues': { description: 'Regular membership dues collected from active members' },
  'New Member Fees': { description: 'One-time fees collected from new members and pledges' },
  'Fundraising': { description: 'Revenue from fundraising events and campaigns' },
  'Alumni Donations': { description: 'Contributions and gifts from alumni members' },
  'Fines': { description: 'Fines collected for missed events, late payments, etc.' },
  'Event Ticket Sales': { description: 'Revenue from ticketed events and formals' },
  'Sponsorships': { description: 'Corporate sponsorships and partnership revenue' },
  'Interest/Returns': { description: 'Bank interest, investment returns, and dividends' },
};

/**
 * Default Plaid-to-app category mappings (global, chapter_id = NULL).
 * Keys are `plaid_primary` or `plaid_primary:plaid_detailed`.
 */
export const DEFAULT_PLAID_MAPPINGS: Record<string, string> = {
  'FOOD_AND_DRINK': 'Food/Meals',
  'RENT_AND_UTILITIES': 'Housing',
  'ENTERTAINMENT': 'Social',
  'RECREATION': 'Athletics/Intramurals',
  'GENERAL_SERVICES:INSURANCE': 'Insurance',
  'GENERAL_SERVICES': 'Operations',
  'INCOME:DIVIDENDS': 'Interest/Returns',
  'INCOME:INTEREST': 'Interest/Returns',
  'TRANSFER_IN:DEPOSIT': 'Member Dues',
  'TRANSFER_IN': 'Operations',
  'TRANSFER_OUT': 'Operations',
  'TRANSPORTATION': 'Operations',
};

/**
 * Payment platforms that are fund transfers, not actual spending.
 * Transactions to these services get transaction_type='transfer'.
 * Detected during Plaid sync via merchant name pattern matching.
 */
export const TRANSFER_SERVICE_NAMES = ['Switch', 'Grink'] as const;
