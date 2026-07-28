import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import BookInventoryClient from './BookInventoryClient'

export const dynamic = 'force-dynamic'

export default async function AdminBooksPage() {
  const supabase = await createClient()

  // Authenticate user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login?redirectTo=/admin/books')
  }

  // Fetch admin profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAuthorized = ['admin', 'teacher', 'instructor'].includes(profile?.role)
  if (!isAuthorized) {
    redirect('/login?error=Forbidden')
  }

  // Fetch all books
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false })

  if (booksError) {
    console.error('[ADMIN_BOOKS] Error fetching books:', booksError)
  }

  return (
    <BookInventoryClient
      user={user}
      profile={profile}
      initialBooks={books || []}
    />
  )
}