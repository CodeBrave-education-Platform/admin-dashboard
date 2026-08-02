import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export async function createClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-id") ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("your-supabase-anon-key")
  ) {
    const createMockQuery = () => {
      const mockResult = Promise.resolve({ data: [], error: null })
      const chainable = {
        select: () => chainable,
        insert: () => chainable,
        update: () => chainable,
        upsert: () => chainable,
        delete: () => chainable,
        eq: () => chainable,
        neq: () => chainable,
        gt: () => chainable,
        gte: () => chainable,
        lt: () => chainable,
        lte: () => chainable,
        like: () => chainable,
        ilike: () => chainable,
        is: () => chainable,
        in: () => chainable,
        not: () => chainable,
        or: () => chainable,
        filter: () => chainable,
        match: () => chainable,
        contains: () => chainable,
        containedBy: () => chainable,
        range: () => chainable,
        order: () => chainable,
        limit: () => chainable,
        single: async () => ({ data: { role: 'admin' }, error: null }),
        maybeSingle: async () => ({ data: { role: 'admin' }, error: null }),
        then: (onFulfilled, onRejected) => mockResult.then(onFulfilled, onRejected),
        catch: (onRejected) => mockResult.catch(onRejected)
      }
      return chainable
    }

    return {
      auth: {
        getUser: async () => ({
          data: { user: { id: 'admin-01', email: 'admin@codebrave.edu.in', role: 'admin' } },
          error: null
        }),
        getSession: async () => ({
          data: { session: { user: { id: 'admin-01', email: 'admin@codebrave.edu.in', role: 'admin' } } },
          error: null
        })
      },
      from: () => createMockQuery()
    }
  }

  const cookieStore = await cookies()
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const cookieDomain = (host.endsWith('institute.com') || host.includes('institute.com')) ? '.institute.com' : undefined

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const updatedOptions = { ...options }
              if (cookieDomain) {
                updatedOptions.domain = cookieDomain
              }
              cookieStore.set(name, value, updatedOptions)
            })
          } catch (error) {
          }
        },
      },
    }
  )
}
