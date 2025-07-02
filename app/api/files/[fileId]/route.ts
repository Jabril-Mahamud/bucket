import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    console.log(`[API] Received request for fileId: ${fileId}`);
    const supabase = await createClient();

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[API] Unauthorized access attempt or user not found:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[API] User authenticated: ${user.id}`);

    // Get file metadata
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (fileError || !file) {
      console.error(`[API] File metadata not found for fileId ${fileId}:`, fileError);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    console.log(`[API] File metadata found: ${file.filename}, type: ${file.file_type}`);

    // Get file from storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('user-files')
      .download(file.file_path);

    if (storageError || !fileData) {
      console.error(`[API] File not accessible from storage for fileId ${fileId}:`, storageError);
      return NextResponse.json({ error: 'File not accessible' }, { status: 404 });
    }
    console.log(`[API] File data downloaded from storage. Size: ${fileData.size}`);

    // Update last accessed time (optional tracking)
    await supabase
      .from('files')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', fileId)
      .eq('user_id', user.id);
    console.log(`[API] Last accessed time updated for fileId: ${fileId}`);

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    console.log(`[API] Converted file data to ArrayBuffer. Length: ${arrayBuffer.byteLength}`);

    // Determine Content-Type for EPUB files
    let contentType = file.file_type;
    if (file.file_type === 'application/octet-stream' && file.filename.endsWith('.epub')) {
      contentType = 'application/epub+zip';
      console.log(`[API] Overriding Content-Type to ${contentType} for EPUB file.`);
    }

    // Return file with proper headers
    const response = new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': (file.file_size || 0).toString(),
        'Content-Disposition': `inline; filename="${file.filename}"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
    console.log(`[API] Returning NextResponse with Content-Type: ${contentType}`);
    return response;

  } catch (error) {
    console.error('[API] Error serving file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}