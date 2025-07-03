// app/api/convert/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { CloudConvertService } from "@/lib/cloudconvert";
import { TablesInsert } from "@/lib/supabase/database.types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check if file type is supported
    if (!CloudConvertService.isSupportedFileType(file.type)) {
      return NextResponse.json({ 
        error: `Unsupported file type: ${file.type}. Supported types: PDF, EPUB, TXT, DOC, DOCX, RTF, HTML, Markdown` 
      }, { status: 400 });
    }

    // Convert file to text using CloudConvert
    const cloudConvert = new CloudConvertService();
    const conversionResult = await cloudConvert.convertFileToText(file);

    if (!conversionResult.success) {
      return NextResponse.json({ 
        error: `Conversion failed: ${conversionResult.error}` 
      }, { status: 500 });
    }

    if (!conversionResult.text) {
      return NextResponse.json({ 
        error: 'No text content extracted from file' 
      }, { status: 400 });
    }

    // Save text content to Supabase Storage
    const textFileName = `${file.name.replace(/\.[^/.]+$/, '')}.txt`;
    const textFilePath = `${user.id}/${textFileName}`;
    
    const { data: storageData, error: storageError } = await supabase.storage
      .from('user-files')
      .upload(textFilePath, new Blob([conversionResult.text], { type: 'text/plain' }), {
        upsert: false
      });

    if (storageError) {
      return NextResponse.json({ 
        error: `Storage error: ${storageError.message}` 
      }, { status: 500 });
    }

    // Save file metadata to database
    const fileInsert: TablesInsert<"files"> = {
      user_id: user.id,
      filename: textFileName,
      file_path: storageData.path,
      file_type: 'text/plain',
      file_size: new Blob([conversionResult.text]).size,
      original_filename: file.name,
      original_file_type: file.type,
      original_file_size: file.size,
      text_content: conversionResult.text,
      conversion_status: 'completed'
    };

    const { data: fileData, error: dbError } = await supabase
      .from('files')
      .insert(fileInsert)
      .select()
      .single();

    if (dbError) {
      // Clean up storage if database insert fails
      await supabase.storage
        .from('user-files')
        .remove([storageData.path]);
        
      return NextResponse.json({ 
        error: `Database error: ${dbError.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      file: fileData,
      textLength: conversionResult.text.length,
      message: 'File converted to text successfully'
    });

  } catch (error) {
    console.error('Conversion API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during conversion' 
    }, { status: 500 });
  }
}