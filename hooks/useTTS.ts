// hooks/useTTS.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface VoiceOption {
  id: string;
  name: string;
  languageCode: string;
  gender: string;
  description?: string;
}

export interface TTSUsage {
  total_characters: number;
  total_cost_cents: number;
  current_month: string;
}

export interface TTSError {
  message: string;
  code?: string;
}

export function useTTS() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('Joanna');
  const [error, setError] = useState<TTSError | null>(null);
  const [currentUsage, setCurrentUsage] = useState<TTSUsage | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrl = useRef<string | null>(null);
  const supabase = createClient();

  // Cleanup audio URL when component unmounts
  useEffect(() => {
    return () => {
      if (currentAudioUrl.current) {
        URL.revokeObjectURL(currentAudioUrl.current);
      }
    };
  }, []);

  // Fetch available voices
  const fetchVoices = useCallback(async (languageCode?: string) => {
    try {
      setError(null);
      const params = languageCode ? `?lang=${languageCode}` : '';
      const response = await fetch(`/api/tts${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch voices');
      }

      const data = await response.json();
      setVoices(data.voices);
      
      // Set default voice if none selected
      if (data.voices.length > 0 && !selectedVoice) {
        setSelectedVoice(data.voices[0].id);
      }
    } catch (err) {
      console.error('Error fetching voices:', err);
      setError({
        message: err instanceof Error ? err.message : 'Failed to fetch voices'
      });
    }
  }, [selectedVoice]);

  // Fetch current month usage
  const fetchCurrentUsage = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_current_month_tts_usage', {
        target_user_id: user.id
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setCurrentUsage(data[0]);
      }
    } catch (err) {
      console.error('Error fetching usage:', err);
    }
  }, [supabase]);

  // Convert text to speech
  const convertToSpeech = useCallback(async (
    text: string, 
    options?: { 
      voiceId?: string; 
      fileId?: string; 
      autoPlay?: boolean;
    }
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      // Clean up previous audio
      if (currentAudioUrl.current) {
        URL.revokeObjectURL(currentAudioUrl.current);
        currentAudioUrl.current = null;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId: options?.voiceId || selectedVoice,
          fileId: options?.fileId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'TTS conversion failed');
      }

      // Get usage info from headers
      const characterCount = response.headers.get('X-Character-Count');
      const costCents = response.headers.get('X-Cost-Cents');

      // Create audio blob and URL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      currentAudioUrl.current = audioUrl;

      // Create or update audio element
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = audioUrl;

      // Set up audio event listeners
      audioRef.current.onplay = () => setIsPlaying(true);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => {
        setError({ message: 'Audio playback error' });
        setIsPlaying(false);
      };

      // Auto-play if requested
      if (options?.autoPlay !== false) {
        await audioRef.current.play();
      }

      // Update usage
      await fetchCurrentUsage();

      return {
        audioUrl,
        characterCount: characterCount ? parseInt(characterCount) : 0,
        costCents: costCents ? parseInt(costCents) : 0,
      };

    } catch (err) {
      console.error('TTS conversion error:', err);
      setError({
        message: err instanceof Error ? err.message : 'TTS conversion failed'
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedVoice, fetchCurrentUsage]);

  // Play/pause audio
  const togglePlayback = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError({ message: 'Playback failed' });
    }
  }, [isPlaying]);

  // Stop audio
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize voices on mount
  useEffect(() => {
    fetchVoices();
    fetchCurrentUsage();
  }, [fetchVoices, fetchCurrentUsage]);

  return {
    // State
    isLoading,
    isPlaying,
    voices,
    selectedVoice,
    error,
    currentUsage,

    // Actions
    convertToSpeech,
    togglePlayback,
    stopPlayback,
    fetchVoices,
    fetchCurrentUsage,
    setSelectedVoice,
    clearError,

    // Audio ref for advanced usage
    audioRef: audioRef.current,
  };
}