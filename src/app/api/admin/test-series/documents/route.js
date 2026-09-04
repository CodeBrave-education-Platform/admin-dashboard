import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase configuration missing in environment');
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
    const { data: doc } = await supabase
      .from('question_paper_documents')
      .select('metadata')
      .eq('id', id)
      .maybeSingle();

    if (doc?.metadata?.storage_path) {
      try {
        await supabase.storage.from('question-papers').remove([doc.metadata.storage_path]);
      } catch (storageErr) {
        console.warn('[Admin Documents API] Storage delete warning:', storageErr.message);
      }
    }

    // 2. Delete row from question_paper_documents
    const { error } = await supabase
      .from('question_paper_documents')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Documents API] DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
