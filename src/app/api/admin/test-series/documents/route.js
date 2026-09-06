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

export async function GET(request) {
  try {
    const supabase = getAdminClient();

    // 1. Query database records if table exists
    let dbDocs = [];
    try {
      const { data, error } = await supabase
        .from('question_paper_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        dbDocs = data;
      } else {
        console.warn('[Admin Documents API] DB query notice:', error?.message);
      }
    } catch (dbErr) {
      console.warn('[Admin Documents API] DB select exception:', dbErr.message);
    }

    // 2. Query Supabase Storage bucket 'question-papers' (uploads/ folder)
    let storageFiles = [];
    try {
      const { data: files, error: storageErr } = await supabase
        .storage
        .from('question-papers')
        .list('uploads', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (!storageErr && Array.isArray(files)) {
        storageFiles = files.filter(f => f.name && !f.name.startsWith('.'));
      }
    } catch (sErr) {
      console.warn('[Admin Documents API] Storage list warning:', sErr.message);
    }

    // 3. Reconcile storage files with DB docs (auto-index any missing uploaded files)
    const knownPaths = new Set(
      dbDocs.map(d => d.metadata?.storage_path || `uploads/${d.file_name}`)
    );

    const missingDocsToInsert = [];
    for (const file of storageFiles) {
      const storagePath = `uploads/${file.name}`;
      if (!knownPaths.has(storagePath)) {
        const { data: { publicUrl } } = supabase
          .storage
          .from('question-papers')
          .getPublicUrl(storagePath);

        // Derive clean title from filename
        // e.g. 1788670017232_2024_1_English.pdf -> 2024 1 English
        const rawName = file.name.replace(/^\d+_/, '').replace(/\.pdf$/i, '');
        const cleanTitle = rawName.replace(/[-_]+/g, ' ').trim() || 'Uploaded Question Paper';

        const synthesizedDoc = {
          id: `storage_${file.id || file.name}`,
          title: cleanTitle,
          file_url: publicUrl || '',
          file_name: file.name,
          file_size_bytes: file.metadata?.size || 0,
          subject: 'Full Syllabus',
          target_exam: 'JEE Main',
          status: 'ready_to_compile',
          metadata: {
            storage_path: storagePath,
            original_name: file.name,
            uploaded_at: file.created_at || new Date().toISOString()
          },
          created_at: file.created_at || new Date().toISOString()
        };

        dbDocs.unshift(synthesizedDoc);
        knownPaths.add(storagePath);

        missingDocsToInsert.push({
          title: cleanTitle,
          file_url: publicUrl || '',
          file_name: file.name,
          file_size_bytes: file.metadata?.size || 0,
          subject: 'Full Syllabus',
          target_exam: 'JEE Main',
          status: 'ready_to_compile',
          metadata: synthesizedDoc.metadata
        });
      }
    }

    // 4. Background persist missing documents to database table if possible
    if (missingDocsToInsert.length > 0) {
      supabase
        .from('question_paper_documents')
        .insert(missingDocsToInsert)
        .then(({ data, error }) => {
          if (error) {
            console.warn('[Admin Documents API] Auto-index insert notice:', error.message);
          } else {
            console.log(`[Admin Documents API] Successfully auto-indexed ${missingDocsToInsert.length} files from storage.`);
          }
        })
        .catch(e => console.warn('[Admin Documents API] Background insert catch:', e.message));
    }

    return NextResponse.json({
      success: true,
      documents: dbDocs
    });

  } catch (err) {
    console.error('[Admin Documents API] GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
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
