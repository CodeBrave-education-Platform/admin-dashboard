import { createClient } from '@/utils/supabase/server'
import AdminLayoutShell from '@/components/AdminLayoutShell'
import CompilerClient from './CompilerClient'

export const dynamic = 'force-dynamic'

export default async function CompilerPage() {
  const supabase = await createClient()

  // Authenticate user session gracefully
  const { data: { user } } = await supabase.auth.getUser()
  const authenticatedUser = user || { id: 'admin-user-01', email: 'admin@Asentra.edu.in' }

  // Fetch all packages available to link the compiled exam
  let packages = []
  try {
    const { data: dbPackages } = await supabase
      .from('test_packages')
      .select('id, title')
      .order('created_at', { ascending: false })
    if (dbPackages) packages = dbPackages
  } catch (e) {}

  return (
    <AdminLayoutShell
      title="NTA CBT Test & Question Compiler"
      subtitle="Author, Compile, and Publish Full-Length CBT Exams with Custom Subject Weightages and Marking Schemes"
    >
      <CompilerClient 
        user={authenticatedUser}
        packages={packages}
        initialPackages={packages}
      />
    </AdminLayoutShell>
  )
}
