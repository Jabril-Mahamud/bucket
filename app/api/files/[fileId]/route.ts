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

    // Get file metadata - handle the case where no file is found
    const { data: files, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id);

    if (fileError) {
      console.error("Database error:", fileError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const file = files[0];

    // Get file from storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('user-files')
      .download(file.file_path);

    if (storageError || !fileData) {
      console.error("Storage error:", storageError);
      return NextResponse.json({ error: 'File not accessible' }, { status: 404 });
    }

    // Update last accessed time (optional tracking)
    await supabase
      .from('files')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', fileId)
      .eq('user_id', user.id);

    if (file.file_type === "text/plain") {
      const textContent = await fileData.text();
      return new NextResponse(textContent, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `inline; filename="${file.filename}"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } else {
      // Convert blob to array buffer for other file types
      const arrayBuffer = await fileData.arrayBuffer();

      // Return file with proper headers
      return new NextResponse(arrayBuffer, {
        headers: {
          "Content-Type": file.file_type,
          "Content-Length": (file.file_size || 0).toString(),
          "Content-Disposition": `inline; filename="${file.filename}"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}