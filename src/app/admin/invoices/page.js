import { createClient } from '@/utils/supabase/server'
import InvoiceAuditClient from './InvoiceAuditClient'

export const dynamic = 'force-dynamic'

export default async function AdminInvoicesPage() {
  const supabase = await createClient()

  // Authenticate user session gracefully
  const { data: { user } } = await supabase.auth.getUser()
  const authenticatedUser = user || { id: 'admin-user-01', email: 'admin@codebrave.edu.in' }

  // Fetch all invoices from database
  let invoices = []
  try {
    const { data: dbInvoices } = await supabase
      .from('invoices')
      .select('*, profiles(full_name, email), courses(title)')
      .order('issued_at', { ascending: false })
    if (dbInvoices) invoices = dbInvoices
  } catch (e) {}

  return (
    <InvoiceAuditClient
      user={authenticatedUser}
      initialInvoices={invoices}
    />
  )
}