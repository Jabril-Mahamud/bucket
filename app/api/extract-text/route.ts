// app/api/extract-text/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const PDF_CO_API_KEY = process.env.PDF_CO_API_KEY;
const PDF_CO_BASE_URL = "https://api.pdf.co/v1";

interface PdfCoTextExtractionResponse {
  error: boolean;
  message?: string;
  body?: string;
  url?: string;
}

interface PdfCoUploadResponse {
  error: boolean;
  message?: string;
  url?: string;
}

async function extractTextWithPdfCo(fileBuffer: ArrayBuffer, fileName: string, fileType: string): Promise<string> {
  if (!PDF_CO_API_KEY) {
    throw new Error("PDF.co API key not configured");
  }

  try {
    // Handle different file types
    if (fileType === 'text/plain') {
      // For text files, just return the content directly
      return new TextDecoder().decode(fileBuffer);
    }

    if (fileType.startsWith('audio/')) {
      // For audio files, we can't extract text content
      // Return a placeholder or use a speech-to-text service
      return `[Audio file: ${fileName}]`;
    }

    // For PDFs and other documents, use PDF.co
    if (fileType === 'application/pdf' || fileType === 'application/epub+zip') {
      // First, upload file to PDF.co
      const uploadFormData = new FormData();
      uploadFormData.append('file', new Blob([fileBuffer], { type: fileType }), fileName);
      
      const uploadResponse = await fetch(`${PDF_CO_BASE_URL}/file/upload`, {
        method: 'POST',
        headers: {
          'x-api-key': PDF_CO_API_KEY,
        },
        body: uploadFormData,
      });

      const uploadResult: PdfCoUploadResponse = await uploadResponse.json();
      
      if (uploadResult.error || !uploadResult.url) {
        throw new Error(uploadResult.message || 'Failed to upload file to PDF.co');
      }

      // Extract text from the uploaded file
      const extractFormData = new FormData();
      extractFormData.append('url', uploadResult.url);
      extractFormData.append('async', 'false'); // Synchronous processing
      
      const extractResponse = await fetch(`${PDF_CO_BASE_URL}/pdf/convert/to/text`, {
        method: 'POST',
        headers: {
          'x-api-key': PDF_CO_API_KEY,
        },
        body: extractFormData,
      });

      const extractResult: PdfCoTextExtractionResponse = await extractResponse.json();
      
      if (extractResult.error) {
        throw new Error(extractResult.message || 'Failed to extract text from PDF');
      }

      // If async processing, we'd need to poll for results
      // For sync processing, the text is in the body
      if (extractResult.body) {
        return extractResult.body;
      } else if (extractResult.url) {
        // Download the extracted text
        const textResponse = await fetch(extractResult.url);
        return await textResponse.text();
      } else {
        throw new Error('No text content returned from PDF.co');
      }
    }

    // For unsupported file types
    return `[Unsupported file type: ${fileType}]`;
    
  } catch (error) {
    console.error('PDF.co text extraction error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json();
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

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

    // Check if extraction is already in progress or completed
    if (file.extraction_status === 'processing') {
      return NextResponse.json({ error: 'Extraction already in progress' }, { status: 409 });
    }

    if (file.extraction_status === 'completed') {
      return NextResponse.json({ 
        message: 'Text already extracted',
        extractedText: file.extracted_text,
        wordCount: file.word_count 
      });
    }

    // Update status to processing
    await supabase
      .from('files')
      .update({ 
        extraction_status: 'processing',
        extraction_error: null 
      })
      .eq('id', fileId)
      .eq('user_id', user.id);

    try {
      // Download file from storage
      const { data: fileData, error: storageError } = await supabase.storage
        .from('user-files')
        .download(file.file_path);

      if (storageError || !fileData) {
        throw new Error('Failed to download file from storage');
      }

      // Convert blob to array buffer
      const arrayBuffer = await fileData.arrayBuffer();

      // Extract text using PDF.co
      const extractedText = await extractTextWithPdfCo(
        arrayBuffer,
        file.filename,
        file.file_type
      );

      // Update database with extracted text
      const { error: updateError } = await supabase
        .from('files')
        .update({
          extracted_text: extractedText,
          extraction_status: 'completed',
          extraction_completed_at: new Date().toISOString(),
          extraction_error: null
        })
        .eq('id', fileId)
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Calculate word count (will be done by trigger, but we can return it)
      const wordCount = extractedText ? extractedText.split(/\s+/).length : 0;

      return NextResponse.json({
        message: 'Text extraction completed successfully',
        extractedText: extractedText,
        wordCount: wordCount
      });

    } catch (extractionError) {
      console.error('Text extraction failed:', extractionError);
      
      // Update status to failed
      await supabase
        .from('files')
        .update({
          extraction_status: 'failed',
          extraction_error: extractionError instanceof Error ? extractionError.message : 'Unknown error'
        })
        .eq('id', fileId)
        .eq('user_id', user.id);

      return NextResponse.json({
        error: 'Text extraction failed',
        details: extractionError instanceof Error ? extractionError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}