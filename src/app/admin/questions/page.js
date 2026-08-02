import { createClient } from '@/utils/supabase/server'
import AdminLayoutShell from '@/components/AdminLayoutShell'
import QuestionBankClient from './QuestionBankClient'

export const dynamic = 'force-dynamic'

export default async function AdminQuestionBankPage() {
  const supabase = await createClient()

  // Authenticate user session
  const { data: { user } } = await supabase.auth.getUser()
  const authenticatedUser = user || { id: 'admin-user-01', email: 'admin@codebrave.edu.in' }

  return (
    <AdminLayoutShell
      title="Centralized NTA Question Bank Repository"
      subtitle="Author, Tag, and Store Reusable Questions across all 5 NTA Formats with Diagram Previews & AI PDF Parsing"
    >
      <QuestionBankClient user={authenticatedUser} />
    </AdminLayoutShell>
  )
}
