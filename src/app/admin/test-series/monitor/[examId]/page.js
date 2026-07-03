import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AdminLayoutShell from '@/components/AdminLayoutShell'
import MonitorClient from './MonitorClient'

export const dynamic = 'force-dynamic'

export default async function MonitorPage({ params }) {
  const { examId } = await params
  
  const supabase = await createClient()

  // Authenticate user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect(`/login?redirectTo=/admin/test-series/monitor/${examId}`)
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

  // Fetch exam outline info
  const { data: exam, error: examErr } = await supabase
    .from('test_exams')
    .select('*, test_packages(title)')
    .eq('id', examId)
    .single()

  if (examErr || !exam) {
    console.error('[Monitor] Exam load error:', examErr)
    notFound()
  }

  return (
    <AdminLayoutShell
      title="Live Exam Cockpit & Telemetry"
      subtitle={`Proctoring active test series window: ${exam.title}`}
    >
      <MonitorClient exam={exam} />
    </AdminLayoutShell>
  )
}
