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
  },
  users: {
    directory: ['users', 'directory'] as const,
  },
} as const
