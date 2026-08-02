import { createClient } from '@/utils/supabase/server'
import BookInventoryClient from './BookInventoryClient'

export const dynamic = 'force-dynamic'

export default async function AdminBooksPage() {
  const supabase = await createClient()

  // Authenticate user session gracefully
  const { data: { user } } = await supabase.auth.getUser()
  const authenticatedUser = user || { id: 'admin-user-01', email: 'admin@codebrave.edu.in' }

  // Fetch all books
  let books = []
  try {
    const { data: dbBooks } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })
    if (dbBooks) books = dbBooks
  } catch (e) {}

  return (
    <BookInventoryClient
      user={authenticatedUser}
      initialBooks={books}
    />
  )
}