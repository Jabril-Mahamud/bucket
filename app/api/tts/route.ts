// app/api/tts/route.ts
import { createClient } from "@/lib/supabase/server";
import { PollyService } from "@/lib/polly";
import { NextRequest, NextResponse } from "next/server";
import { TablesInsert } from "@/lib/supabase/database.types";

interface TTSRequestBody {
  text: string;
  voiceId?: string;
  fileId?: string; // Optional, for tracking which file the TTS is for
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: TTSRequestBody = await request.json();
    const { text, voiceId = 'Joanna', fileId } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Check current month usage (optional: implement usage limits)
    const { data: currentUsage } = await supabase
      .rpc('get_current_month_tts_usage', { target_user_id: user.id });

    const monthlyUsage = currentUsage?.[0];
    
    // Optional: Implement usage limits (e.g., 100,000 characters per month for free tier)
    const MONTHLY_LIMIT = 100000; // 100k characters
    if (monthlyUsage && monthlyUsage.total_characters >= MONTHLY_LIMIT) {
      return NextResponse.json({ 
        error: 'Monthly TTS usage limit exceeded',
        currentUsage: monthlyUsage.total_characters,
        limit: MONTHLY_LIMIT
      }, { status: 429 });
    }

    // Initialize Polly service
    const polly = new PollyService();

    // Check if service is configured
    const isConfigured = await polly.isConfigured();
    if (!isConfigured) {
      return NextResponse.json({ 
        error: 'TTS service not available' 
      }, { status: 503 });
    }

    // Convert text to speech
    const ttsResult = await polly.textToSpeech({
      text,
      voiceId,
      outputFormat: 'mp3',
      sampleRate: '22050'
    });

    if (!ttsResult.success) {
      return NextResponse.json({ 
        error: ttsResult.error || 'TTS conversion failed' 
      }, { status: 500 });
    }

    // Get original file info if fileId is provided
    let originalFile = null;
    if (fileId) {
      const { data: fileData } = await supabase
        .from('files')
        .select('filename, title, author')
        .eq('id', fileId)
        .eq('user_id', user.id)
        .single();
      
      originalFile = fileData;
    }

    // Generate a clean, readable filename for the audio file
    const baseFilename = originalFile?.filename || 'converted-text';
    const cleanBaseName = baseFilename.replace(/\.[^/.]+$/, ''); // Remove extension
    const audioFilename = `${cleanBaseName} (Audio).mp3`;
    const audioFilePath = `${user.id}/${audioFilename}`;

    // Save audio file to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('user-files')
      .upload(audioFilePath, ttsResult.audioStream!, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    if (storageError) {
      console.error('Storage error:', storageError);
      return NextResponse.json({ 
        error: `Failed to save audio file: ${storageError.message}` 
      }, { status: 500 });
    }

    // Create file entry in database with clean title
    const audioFileInsert: TablesInsert<"files"> = {
      user_id: user.id,
      filename: audioFilename,
      file_path: storageData.path,
      file_type: 'audio/mpeg',
      file_size: ttsResult.audioStream!.length,
      title: originalFile?.title ? `${originalFile.title} (Audio)` : `${cleanBaseName} (Audio)`,
      author: originalFile?.author || null,
    };

    const { data: audioFileData, error: dbError } = await supabase
      .from('files')
      .insert(audioFileInsert)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up storage if database insert fails
      await supabase.storage
        .from('user-files')
        .remove([storageData.path]);
        
      return NextResponse.json({ 
        error: `Database error: ${dbError.message}` 
      }, { status: 500 });
    }

    // Track usage in database
    const { error: usageError } = await supabase
      .from('tts_usage')
      .insert({
        user_id: user.id,
        file_id: fileId || null,
        text_snippet: text.substring(0, 100), // First 100 chars for reference
        character_count: ttsResult.characterCount,
        voice_id: voiceId,
        cost_cents: ttsResult.costCents,
        audio_url: audioFileData.file_path, // Store the file path
      });

    if (usageError) {
      console.error('Error tracking TTS usage:', usageError);
      // Don't fail the request if usage tracking fails
    }

    // Return success with file info
    return NextResponse.json({
      success: true,
      message: 'Audio conversion completed and saved to library',
      audioFile: {
        id: audioFileData.id,
        filename: audioFileData.filename,
        fileSize: audioFileData.file_size,
      },
      characterCount: ttsResult.characterCount,
      costCents: ttsResult.costCents,
    });

  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// GET endpoint to fetch available voices (unchanged)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user (authentication check)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const polly = new PollyService();
    
    // Get language code from query params
    const { searchParams } = new URL(request.url);
    const languageCode = searchParams.get('lang') || undefined;

    const voices = await polly.getAvailableVoices(languageCode);

    return NextResponse.json({ voices });

  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch voices' 
    }, { status: 500 });
  }
}