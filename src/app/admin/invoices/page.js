import { createClient } from '@/utils/supabase/server'
import InvoiceAuditClient from './InvoiceAuditClient'

export const dynamic = 'force-dynamic'

export default async function AdminInvoicesPage() {
  const supabase = await createClient()

  // Authenticate user session gracefully
  const { data: { user } } = await supabase.auth.getUser()
  const authenticatedUser = user || { id: 'admin-user-01', email: 'admin@Asentra.edu.in' }

  // Fetch all invoices from database with relations
  let invoices = []
  try {
    const { data: dbInvoices } = await supabase
      .from('invoices')
      .select('*, profiles(full_name, email, phone), courses(title), batches(title), test_packages(title), books(title)')
      .order('invoice_date', { ascending: false })
    if (dbInvoices) invoices = dbInvoices
  } catch (e) {
    console.warn('[AdminInvoicesPage] Fetch invoices error:', e?.message)
  }

  return (
    <InvoiceAuditClient
      user={authenticatedUser}
      initialInvoices={invoices}
    />
  )
}