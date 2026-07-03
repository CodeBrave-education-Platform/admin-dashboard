import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayoutShell from '@/components/AdminLayoutShell'
import TestSeriesManageClient from './TestSeriesManageClient'

export const dynamic = 'force-dynamic'

export default async function TestSeriesDashboardPage() {
  const supabase = await createClient()

  // Authenticate user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login?redirectTo=/admin/test-series')
  }

  // Fetch role and verify permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAuthorized = profile && ['admin', 'teacher', 'instructor'].includes(profile.role)
  if (!isAuthorized) {
    redirect('/login?error=Forbidden:+Administrative+permissions+required.')
  }

  // Fetch test packages
  const { data: packages, error: pkgError } = await supabase
    .from('test_packages')
    .select('*')
    .order('created_at', { ascending: false })

  if (pkgError) {
    console.error('[TEST_SERIES_DASHBOARD] Error fetching packages:', pkgError)
  }

  // Fetch exams
  const { data: exams, error: examError } = await supabase
    .from('test_exams')
    .select('id, package_id, title, duration_minutes, total_questions, is_live_ranking, activation_timestamp, created_at')
    .order('created_at', { ascending: false })

  if (examError) {
    console.error('[TEST_SERIES_DASHBOARD] Error fetching exams:', examError)
  }

  // Fetch attempts joined with profiles and test_exams
  const { data: attempts, error: attemptError } = await supabase
    .from('test_attempts')
    .select('*, profiles(full_name, email), test_exams(title)')
    .order('completed_at', { ascending: false })
    .limit(10)

  if (attemptError) {
    console.error('[TEST_SERIES_DASHBOARD] Error fetching attempts:', attemptError)
  }

  return (
    <AdminLayoutShell
      title="CBT Test Series Dashboard"
      subtitle="Establish mock test bundles, schedule proctored exams, author question sheets, and inspect scorecard results."
    >
      <TestSeriesManageClient
        initialPackages={packages || []}
        initialExams={exams || []}
        initialAttempts={attempts || []}
      />
    </AdminLayoutShell>
  )
}
