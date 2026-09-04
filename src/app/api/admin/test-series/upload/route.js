import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const title = formData.get('title');
    const subject = formData.get('subject') || 'Full Syllabus';
    const targetExam = formData.get('target_exam') || 'JEE Main';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'No PDF file provided in request' }, { status: 400 });
    }

    if (!title || !String(title).trim()) {
      return NextResponse.json({ success: false, error: 'Title is required for the question paper' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Prepare unique storage filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageFilePath = `uploads/${timestamp}_${sanitizedName}`;

    // 3. Upload to Supabase Storage bucket 'question-papers' using service role (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('question-papers')
      .upload(storageFilePath, buffer, {
        contentType: file.type || 'application/pdf',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('[Admin Upload API] Storage upload error:', uploadError);
      return NextResponse.json({ 
        success: false, 
        error: `Storage upload failed: ${uploadError.message}` 
      }, { status: 500 });
    }

    // 4. Retrieve public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('question-papers')
      .getPublicUrl(storageFilePath);

    // 5. Insert metadata record into public.question_paper_documents using service role (bypasses RLS)
    const docPayload = {
      title: String(title).trim(),
      file_url: publicUrl || '',
      file_name: file.name,
      file_size_bytes: file.size,
      subject: String(subject),
      target_exam: String(targetExam),
      status: 'ready_to_compile',
      metadata: {
        original_name: file.name,
        storage_path: storageFilePath,
        uploaded_at: new Date().toISOString()
      }
    };

    const { data: insertedDoc, error: insertError } = await supabase
      .from('question_paper_documents')
      .insert([docPayload])
      .select()
      .single();

    if (insertError) {
      console.error('[Admin Upload API] DB insert error:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: `Database save failed: ${insertError.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document: insertedDoc,
      message: 'Question paper uploaded and indexed successfully'
    });

  } catch (err) {
    console.error('[Admin Upload API] Unexpected error:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || 'Internal server error during upload' 
    }, { status: 500 });
  }
}
