import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-id") ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("your-supabase-anon-key")
  ) {
    const mockQueryBuilder = () => {
      const builder = {
        select: () => builder,
        insert: () => builder,
        update: () => builder,
        upsert: () => builder,
        delete: () => builder,
        eq: () => builder,
        neq: () => builder,
        gt: () => builder,
        gte: () => builder,
        lt: () => builder,
        lte: () => builder,
        like: () => builder,
        ilike: () => builder,
        is: () => builder,
        in: () => builder,
        not: () => builder,
        or: () => builder,
        filter: () => builder,
        match: () => builder,
        contains: () => builder,
        containedBy: () => builder,
        range: () => builder,
        order: () => builder,
        limit: () => builder,
        single: async () => ({ data: { role: 'admin' }, error: null }),
        maybeSingle: async () => ({ data: { role: 'admin' }, error: null }),
        then: (resolve) => resolve({ data: [], error: null })
      }
      return builder
    }

    return {
      auth: {
        signInWithPassword: async ({ email, password }) => {
          return {
            data: {
              user: { id: 'admin-01', email, role: 'admin' },
              session: { access_token: 'mock_admin_token' }
            },
            error: null
          }
        },
        signInWithIdToken: async () => {
          return {
            data: {
              user: { id: 'admin-01', email: 'admin@codebrave.edu.in', role: 'admin' }
            },
            error: null
          }
        },
        signInWithOtp: async () => {
          throw new Error("Missing Supabase Environment Variables.");
        },
        verifyOtp: async () => {
          throw new Error("Missing Supabase Environment Variables.");
        },
        signInWithOAuth: async () => {
          throw new Error("Missing Supabase Environment Variables.");
        },
        updateUser: async () => {
          throw new Error("Missing Supabase Environment Variables.");
        },
        getUser: async () => ({
          data: { user: { id: 'admin-01', email: 'admin@codebrave.edu.in', role: 'admin' } },
          error: null
        }),
        signOut: async () => {},
      },
      from: () => mockQueryBuilder()
    }
  }

  const cookieOptions = {}
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname.endsWith('institute.com') || hostname.includes('institute.com')) {
      cookieOptions.domain = '.institute.com'
    }
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions
    }
  )
}
