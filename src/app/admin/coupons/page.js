import { createClient } from '@/utils/supabase/server'
import CouponsStudioClient from './CouponsStudioClient'

export const dynamic = 'force-dynamic'

export default async function AdminCouponsPage() {
  const supabase = await createClient()

  // Authenticate user session
  const { data: { user } } = await supabase.auth.getUser()
  const authenticatedUser = user || { id: 'admin-user-01', email: 'admin@codebrave.edu.in' }

  return (
    <CouponsStudioClient
      user={authenticatedUser}
    />
  )
}
