// app/api/extraction-status/[fileId]/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const supabase = await createClient();

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get file extraction status
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('extraction_status, extraction_error, word_count, extraction_completed_at')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({
      extractionStatus: file.extraction_status,
      extractionError: file.extraction_error,
      wordCount: file.word_count,
      extractionCompletedAt: file.extraction_completed_at
    });

  } catch (error) {
    console.error('Error checking extraction status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}