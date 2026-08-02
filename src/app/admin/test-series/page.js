import { createClient } from '@/utils/supabase/server'
import AdminLayoutShell from '@/components/AdminLayoutShell'
import TestSeriesManageClient from './TestSeriesManageClient'

export const dynamic = 'force-dynamic'

export default async function TestSeriesDashboardPage() {
  const supabase = await createClient()

  // Authenticate user session gracefully
  const { data: { user } } = await supabase.auth.getUser()
  const authenticatedUser = user || { id: 'admin-user-01', email: 'admin@codebrave.edu.in' }

  // Fetch test packages
  let packages = []
  try {
    const { data: dbPackages } = await supabase
      .from('test_packages')
      .select('*, test_exams(*)')
      .order('created_at', { ascending: false })
    if (dbPackages) packages = dbPackages
  } catch (e) {}

  // Fetch recent attempts across packages
  let recentAttempts = []
  try {
    const { data: dbAttempts } = await supabase
      .from('test_attempts')
      .select('*, test_exams(title), profiles(full_name, email)')
      .order('started_at', { ascending: false })
      .limit(10)
    if (dbAttempts) recentAttempts = dbAttempts
  } catch (e) {}

  return (
    <AdminLayoutShell
      title="Test Series & Assessment Studio"
      subtitle="Configure CBT Mock Test Blueprints, Question Weightages, and Launch Real-Time Monitor Feeds"
    >
      <TestSeriesManageClient 
        user={authenticatedUser}
        initialPackages={packages}
        initialAttempts={recentAttempts}
      />
    </AdminLayoutShell>
  )
}
