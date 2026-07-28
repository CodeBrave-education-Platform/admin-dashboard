import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import InvoiceAuditClient from './InvoiceAuditClient'

export const dynamic = 'force-dynamic'

export default async function AdminInvoicesPage() {
  const supabase = await createClient()

  // Authenticate user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login?redirectTo=/admin/invoices')
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

  // Fetch all invoices from database
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('*, profiles(full_name, email, phone), courses(title), batches(title), test_packages(title), books(title)')
    .order('invoice_date', { ascending: false })

  if (invoicesError) {
    console.error('[ADMIN_INVOICES] Error fetching invoices:', invoicesError)
  }

  return (
    <InvoiceAuditClient
      user={user}
      profile={profile}
      initialInvoices={invoices || []}
    />
  )
}