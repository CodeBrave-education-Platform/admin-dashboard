import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayoutShell from '@/components/AdminLayoutShell'
import CompilerClient from './CompilerClient'

export const dynamic = 'force-dynamic'

export default async function CompilerPage() {
  const supabase = await createClient()

  // Authenticate user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login?redirectTo=/admin/test-series/compiler')
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

  // Fetch all packages available to link the compiled exam
  const { data: packages } = await supabase
    .from('test_packages')
    .select('id, title, target_exam_tag')
    .order('title', { ascending: true })

  return (
    <AdminLayoutShell
      title="CBT Exam Builder & Question Compiler"
      subtitle="Author questions, search the global question bank pool, and compile new test series mock blueprints."
    >
      <CompilerClient packages={packages || []} />
    </AdminLayoutShell>
  )
}
