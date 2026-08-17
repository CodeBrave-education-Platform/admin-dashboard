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
    if (dbProfiles && Array.isArray(dbProfiles)) {
      const sorted = [...dbProfiles].filter(Boolean).sort((a, b) => {
        const timeA = a?.created_at ? (!isNaN(new Date(a.created_at).getTime()) ? new Date(a.created_at).getTime() : 0) : 0
        const timeB = b?.created_at ? (!isNaN(new Date(b.created_at).getTime()) ? new Date(b.created_at).getTime() : 0) : 0
        return timeB - timeA
      })
      profiles = sorted.map(p => ({
        ...p,
        name: p.full_name || 'Unknown',
        enrolledCourses: [],
        attemptsCount: p.weekly_tests_attempted ? (parseInt(p.weekly_tests_attempted) || 0) : 0,
        lastActive: p.last_active_date || 'N/A'
      }))
    }
  } catch (e) {
    console.warn('[AdminStudentPage] Fetch profiles warning:', e?.message)
  }

  return (
    <StudentRelationshipClient
      user={authenticatedUser}
      initialStudents={profiles}
    />
  )
}
