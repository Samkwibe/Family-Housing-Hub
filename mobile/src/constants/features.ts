export const STUB_FEATURES = [
  {
    slug: 'rent',
    title: 'Rent & Payments',
    summary: 'Track due dates, payments, and lease reminders.',
    tips: [
      'Set a calendar reminder 3 days before rent is due.',
      'Save payment confirmations in Documents.',
      'Know your lease end date and notice period.',
    ],
    assistantPrompt: 'How should I track rent payments and due dates?',
  },
  {
    slug: 'maintenance',
    title: 'Maintenance',
    summary: 'Report issues and follow up with your landlord.',
    tips: [
      'Photo-document issues when they start.',
      'Contact your landlord in writing for paper trail.',
      'Urgent: no heat, leaks, electrical — report immediately.',
    ],
    assistantPrompt: 'What should I include in a maintenance request?',
  },
  {
    slug: 'documents',
    title: 'Documents',
    summary: 'Keep leases, receipts, and IDs organized.',
    tips: [
      'Store lease, insurance, and ID copies in one folder.',
      'Name files: YYYY-MM-type (e.g. 2026-03-lease.pdf).',
      'Back up to cloud storage you trust.',
    ],
    assistantPrompt: 'What housing documents should I keep organized?',
  },
  {
    slug: 'landlord',
    title: 'Landlord',
    summary: 'Contact info and communication best practices.',
    tips: [
      'Save landlord phone and email in your contacts.',
      'Use email for non-urgent requests.',
      'Keep a log of calls and responses.',
    ],
    assistantPrompt: 'How do I communicate effectively with my landlord?',
  },
  {
    slug: 'health',
    title: 'Family Health',
    summary: 'Wellness reminders for your household.',
    tips: [
      'Know nearest hospital and pharmacy on Maps.',
      'Keep emergency contacts updated in Settings.',
      'Schedule annual checkups for family members.',
    ],
    assistantPrompt: 'What health resources should families near home know about?',
  },
  {
    slug: 'budget',
    title: 'Budget',
    summary: 'Plan housing costs and monthly spending.',
    tips: [
      'Aim for ~30% of income on housing if possible.',
      'Track utilities separately from rent.',
      'Build a small repair emergency fund.',
    ],
    assistantPrompt: 'Help me create a simple family housing budget.',
  },
  {
    slug: 'calendar',
    title: 'Family Calendar',
    summary: 'Shared dates for rent, school, and events.',
    tips: [
      'Add rent due date as a recurring event.',
      'Share school and work schedules with family.',
      'Review the week every Sunday evening.',
    ],
    assistantPrompt: 'What dates should go on a family housing calendar?',
  },
  {
    slug: 'resources',
    title: 'Community Resources',
    summary: 'Local help for housing, food, and utilities.',
    tips: [
      'Search Maps for food banks and community centers.',
      'Check 211.org for local assistance programs.',
      'Ask your library about housing workshops.',
    ],
    assistantPrompt: 'What community resources help families with housing?',
  },
  {
    slug: 'shopping',
    title: 'Shopping & Meals',
    summary: 'Groceries and meal planning near home.',
    tips: [
      'Use Maps to find grocery stores by category.',
      'Plan weekly meals to reduce food waste.',
      'Compare unit prices on staples.',
    ],
    assistantPrompt: 'Tips for meal planning on a housing budget?',
  },
  {
    slug: 'safety',
    title: 'Family Safety',
    summary: 'Emergency plans and contacts.',
    tips: [
      'Practice fire escape routes twice a year.',
      'Keep a go-bag with essentials.',
      'Know two ways out of every room.',
    ],
    assistantPrompt: 'What should a family emergency safety plan include?',
  },
  {
    slug: 'security',
    title: 'Security',
    summary: 'Locks, alarms, and account safety.',
    tips: [
      'Use strong unique passwords; enable 2FA where offered.',
      'Change locks when moving into a new place.',
      'Do not share account passwords in group chat.',
    ],
    assistantPrompt: 'Home security basics for renters and owners?',
  },
  {
    slug: 'house-search',
    title: 'House Search',
    summary: 'Find homes that fit your family needs.',
    tips: [
      'List must-haves vs nice-to-haves before touring.',
      'Check commute times on the Maps tab.',
      'Compare total monthly cost: rent + utilities + fees.',
    ],
    assistantPrompt: 'What should I look for when searching for a family home?',
  },
  {
    slug: 'children',
    title: 'Children',
    summary: 'Schools, activities, and child-friendly spaces.',
    tips: [
      'Research school districts before signing a lease.',
      'Find parks and libraries nearby on Maps.',
      'Set screen-time and homework routines.',
    ],
    assistantPrompt: 'How do I evaluate neighborhoods for children?',
  },
  {
    slug: 'help',
    title: 'Help Center',
    summary: 'Get answers about using Family Housing Hub.',
    tips: [
      'Use the AI tab for housing questions anytime.',
      'Messages tab: family group chat synced to your account.',
      'Profile: update your address for better Maps context.',
    ],
    assistantPrompt: 'How do I get the most out of Family Housing Hub?',
  },
] as const;

export type FeatureSlug = (typeof STUB_FEATURES)[number]['slug'];
