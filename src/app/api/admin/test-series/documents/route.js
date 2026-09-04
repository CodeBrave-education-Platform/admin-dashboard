import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Verified fallback service role key for production hosting environments
const VERIFIED_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZ2F0YWNleGlwb2lkemhjamh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc3MTc2NCwiZXhwIjoyMDk1MzQ3NzY0fQ.1wx6Y2pseLMBXTdBp7xpl9BAefzvYVAPY95LaA43EBk';
const SUPABASE_PROJECT_URL = 'https://uggatacexipoidzhcjhx.supabase.co';

function cleanEnv(val) {
  if (!val) return '';
  let cleaned = String(val).trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

function getAdminClient() {
  const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || SUPABASE_PROJECT_URL;
  let serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!serviceKey || serviceKey.split('.').length !== 3) {
    serviceKey = VERIFIED_SERVICE_ROLE_KEY;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document id is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Fetch document metadata to find storage path
    try {
      const { data: doc } = await supabase
        .from('question_paper_documents')
        .select('metadata')
        .eq('id', id)
        .maybeSingle();

      if (doc?.metadata?.storage_path) {
        await supabase.storage.from('question-papers').remove([doc.metadata.storage_path]);
      }
    } catch (storageErr) {
      console.warn('[Admin Documents API] Storage delete warning:', storageErr.message);
    }

    // 2. Delete row from question_paper_documents
    try {
      await supabase
        .from('question_paper_documents')
        .delete()
        .eq('id', id);
    } catch (dbErr) {
      console.warn('[Admin Documents API] DB delete warning:', dbErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Documents API] DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
