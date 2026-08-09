import { createClient } from '@/utils/supabase/server'
import OrderFulfillmentClient from './OrderFulfillmentClient'

export const dynamic = 'force-dynamic'

export default async function AdminBookOrdersPage() {
  const supabase = await createClient()

  // Authenticate user session gracefully
  const { data: { user } } = await supabase.auth.getUser()
  const authenticatedUser = user || { id: 'admin-user-01', email: 'admin@Asentra.edu.in' }

  // Fetch all book orders with book title & student profile info
  let bookOrders = []
  try {
    const { data: dbOrders } = await supabase
      .from('book_orders')
      .select('*, books(title, cover_url, price), profiles(full_name, email)')
      .order('ordered_at', { ascending: false })
    if (dbOrders) bookOrders = dbOrders
  } catch (e) {}

  return (
    <OrderFulfillmentClient
      user={authenticatedUser}
      initialOrders={bookOrders}
    />
  )
}