import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Vercel Cron Job to securely delete expired evidence images while retaining OCR metadata
export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();

    // 1. Find all expired evidence that still has a file_url
    const { data: expiredEvidences, error: fetchError } = await supabase
      .from('evidences')
      .select('id, file_url')
      .lt('expires_at', new Date().toISOString())
      .not('file_url', 'is', null);

    if (fetchError) {
      console.error('Error fetching expired evidences:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch expired evidences' }, { status: 500 });
    }

    if (!expiredEvidences || expiredEvidences.length === 0) {
      return NextResponse.json({ success: true, message: 'No expired evidences to clean up.' });
    }

    const filesToDelete = expiredEvidences.map(e => e.file_url).filter(Boolean) as string[];

    // 2. Delete files from Supabase Storage securely
    const { error: storageError } = await supabase.storage
      .from('rekber_evidence')
      .remove(filesToDelete);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      // We will still proceed to nullify the URL if storage deletion partially failed, 
      // but in a strict production environment we might want to track this.
    }

    // 3. Update database: nullify file_url so metadata remains but image link is gone
    const expiredIds = expiredEvidences.map(e => e.id);
    const { error: updateError } = await supabase
      .from('evidences')
      .update({ file_url: null })
      .in('id', expiredIds);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: 'Failed to update evidence records' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount: filesToDelete.length 
    });
  } catch (error) {
    console.error('Cleanup Job Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
