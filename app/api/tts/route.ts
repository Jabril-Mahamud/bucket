// app/api/tts/route.ts
import { createClient } from "@/lib/supabase/server";
import { PollyService } from "@/lib/polly";
import { NextRequest, NextResponse } from "next/server";

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
      });

    if (usageError) {
      console.error('Error tracking TTS usage:', usageError);
      // Don't fail the request if usage tracking fails
    }

    // Return the audio data
    return new NextResponse(ttsResult.audioStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': ttsResult.audioStream!.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'X-Character-Count': ttsResult.characterCount.toString(),
        'X-Cost-Cents': ttsResult.costCents.toString(),
      },
    });

  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// GET endpoint to fetch available voices
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