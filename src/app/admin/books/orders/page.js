import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import OrderFulfillmentClient from './OrderFulfillmentClient'

export const dynamic = 'force-dynamic'

export default async function AdminBookOrdersPage() {
  const supabase = await createClient()

  // Authenticate user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login?redirectTo=/admin/books/orders')
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

  // Fetch all book orders with book title & student profile info
  const { data: bookOrders, error: ordersError } = await supabase
    .from('book_orders')
    .select('*, books(title, cover_url, price), profiles(full_name, email)')
    .order('ordered_at', { ascending: false })

  if (ordersError) {
    console.error('[ADMIN_BOOK_ORDERS] Error fetching book orders:', ordersError)
  }

  return (
    <OrderFulfillmentClient
      user={user}
      profile={profile}
      initialOrders={bookOrders || []}
    />
  )
}