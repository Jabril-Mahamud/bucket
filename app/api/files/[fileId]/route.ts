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

    // Get file metadata
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Get file from storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('user-files')
      .download(file.file_path);

    if (storageError || !fileData) {
      return NextResponse.json({ error: 'File not accessible' }, { status: 404 });
    }

    // Update file access/progress (optional - tracks when file was accessed)
    await supabase
      .from('file_progress')
      .upsert({
        user_id: user.id,
        file_id: fileId,
        progress_percentage: 0, // We'll update this from the client if needed
        last_position: '0',
        updated_at: new Date().toISOString()
      });

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();

    // Return file with proper headers
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': file.file_type,
        'Content-Length': file.file_size.toString(),
        'Content-Disposition': `inline; filename="${file.filename}"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Optional: Add POST method for updating progress
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { progress_percentage, last_position } = await request.json();
    const supabase = await createClient();

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update progress
    const { error } = await supabase
      .from('file_progress')
      .upsert({
        user_id: user.id,
        file_id: fileId,
        progress_percentage: progress_percentage || 0,
        last_position: last_position || '0',
        updated_at: new Date().toISOString()
      });

    if (error) {
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}