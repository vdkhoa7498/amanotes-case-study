export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  points: {
    summary: ['points', 'summary'] as const,
  },
  kudos: {
    coreValues: ['kudos', 'core-values'] as const,
    feed: (scope: 'me' | 'all') => ['kudos', 'feed', scope] as const,
    rankingMonthly: ['kudos', 'ranking', 'monthly'] as const,
    aiSummary: ['kudos', 'ai-summary'] as const,
    aiSearch: (q: string) => ['kudos', 'ai-search', q] as const,
    detail: (kudoId: string) => ['kudos', 'detail', kudoId] as const,
  },
  rewards: {
    catalog: ['rewards', 'catalog'] as const,
  },
  users: {
    directory: ['users', 'directory'] as const,
  },
} as const
