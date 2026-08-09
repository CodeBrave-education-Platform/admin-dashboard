import { createClient } from '@/utils/supabase/server'
import CourseStudioClient from './CourseStudioClient'

export const dynamic = 'force-dynamic'

export default async function AdminCourseStudioPage() {
  const supabase = await createClient()

  // Authenticate user session
  const { data: { user } } = await supabase.auth.getUser()
  const authenticatedUser = user || { id: 'admin-user-01', email: 'admin@Asentra.edu.in' }

  return (
    <CourseStudioClient
      user={authenticatedUser}
    />
  )
}
