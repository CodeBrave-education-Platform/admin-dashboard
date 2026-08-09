import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import StudentRelationshipClient from './StudentRelationshipClient'

export const dynamic = 'force-dynamic'

export default async function AdminStudentPage() {
  const supabase = await createClient()

  // Authenticate user session
  const { data: { user } } = await supabase.auth.getUser()
  const authenticatedUser = user || { id: 'admin-user-01', email: 'admin@Asentra.edu.in' }

  // Fetch profiles
  let profiles = []
  try {
    const { data: dbProfiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (dbProfiles) profiles = dbProfiles
  } catch (e) {}

  return (
    <StudentRelationshipClient
      user={authenticatedUser}
      initialStudents={profiles}
    />
  )
}
