// lib/polly.ts
import { PollyClient, SynthesizeSpeechCommand, Voice, DescribeVoicesCommand, VoiceId, LanguageCode } from '@aws-sdk/client-polly';

export interface TTSRequest {
  text: string;
  voiceId?: string;
  outputFormat?: 'mp3' | 'ogg_vorbis' | 'pcm';
  sampleRate?: string;
}

export interface TTSResponse {
  success: boolean;
  audioStream?: Uint8Array;
  audioUrl?: string;
  characterCount: number;
  costCents: number;
  error?: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  languageCode: string;
  gender: string;
  description?: string;
}

export class PollyService {
  private client: PollyClient;
  private readonly COST_PER_CHARACTER = 0.0004; // $4 per 1M characters = 0.0004 cents per character

  constructor() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
      throw new Error('AWS credentials and region must be configured');
    }

    this.client = new PollyClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  /**
   * Convert text to speech using AWS Polly
   */
  async textToSpeech(request: TTSRequest): Promise<TTSResponse> {
    try {
      // Validate input
      if (!request.text || request.text.trim().length === 0) {
        return {
          success: false,
          error: 'Text content is required',
          characterCount: 0,
          costCents: 0,
        };
      }

      // Limit text length (Polly has a 3000 character limit for standard voices)
      const maxLength = 3000;
      let text = request.text.trim();
      if (text.length > maxLength) {
        text = text.substring(0, maxLength);
        console.warn(`Text truncated to ${maxLength} characters for TTS`);
      }

      const characterCount = text.length;
      const costCents = Math.ceil(characterCount * this.COST_PER_CHARACTER);

      const command = new SynthesizeSpeechCommand({
        Text: text,
        VoiceId: request.voiceId as VoiceId || 'Joanna', // Default to Joanna (US English female)
        OutputFormat: request.outputFormat || 'mp3',
        SampleRate: request.sampleRate || '22050',
        TextType: 'text', // Use 'ssml' if you want to support SSML markup
      });

      const response = await this.client.send(command);

      if (!response.AudioStream) {
        return {
          success: false,
          error: 'No audio stream returned from Polly',
          characterCount,
          costCents,
        };
      }

      // Convert the stream to Uint8Array
      const audioStream = await this.streamToBytes(response.AudioStream);

      return {
        success: true,
        audioStream,
        characterCount,
        costCents,
      };

    } catch (error) {
      console.error('Polly TTS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown TTS error',
        characterCount: request.text?.length || 0,
        costCents: 0,
      };
    }
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(languageCode?: string): Promise<VoiceOption[]> {
    try {
      const command = new DescribeVoicesCommand({
        LanguageCode: languageCode as LanguageCode | undefined,
      });

      const response = await this.client.send(command);
      
      return (response.Voices || []).map((voice: Voice) => ({
        id: voice.Id || '',
        name: voice.Name || '',
        languageCode: voice.LanguageCode || '',
        gender: voice.Gender || '',
        description: `${voice.Name} (${voice.LanguageCode}) - ${voice.Gender}`,
      }));

    } catch (error) {
      console.error('Error fetching voices:', error);
      return this.getDefaultVoices();
    }
  }

  /**
   * Get default voices if API call fails
   */
  private getDefaultVoices(): VoiceOption[] {
    return [
      { id: 'Joanna', name: 'Joanna', languageCode: 'en-US', gender: 'Female', description: 'Joanna (en-US) - Female' },
      { id: 'Matthew', name: 'Matthew', languageCode: 'en-US', gender: 'Male', description: 'Matthew (en-US) - Male' },
      { id: 'Amy', name: 'Amy', languageCode: 'en-GB', gender: 'Female', description: 'Amy (en-GB) - Female' },
      { id: 'Brian', name: 'Brian', languageCode: 'en-GB', gender: 'Male', description: 'Brian (en-GB) - Male' },
      { id: 'Emma', name: 'Emma', languageCode: 'en-GB', gender: 'Female', description: 'Emma (en-GB) - Female' },
      { id: 'Olivia', name: 'Olivia', languageCode: 'en-AU', gender: 'Female', description: 'Olivia (en-AU) - Female' },
    ];
  }

  /**
   * Calculate cost for text length
   */
  calculateCost(characterCount: number): number {
    return Math.ceil(characterCount * this.COST_PER_CHARACTER);
  }

  /**
   * Convert stream to bytes
   */
  private async streamToBytes(stream: unknown): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    
    if (stream instanceof Uint8Array) {
      return stream;
    }

    if (stream instanceof Blob) {
      const arrayBuffer = await stream.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }

    // Handle different stream types
    if (typeof stream === 'object' && stream !== null && Symbol.asyncIterator in stream && typeof (stream as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === 'function') {
      for await (const chunk of stream as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
    } else if (typeof stream === 'object' && stream !== null && 'read' in stream && typeof (stream as { read: () => Uint8Array | null }).read === 'function') {
      // Node.js readable stream
      let chunk;
      while ((chunk = (stream as { read: () => Uint8Array | null }).read()) !== null) {
        chunks.push(chunk);
      }
    } else {
      // Assume it's already a buffer or array
      console.error("Unsupported stream type provided to streamToBytes:", typeof stream, stream);
      throw new Error("Unsupported stream type");
    }

    // Concatenate all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Check if the service is properly configured
   */
  async isConfigured(): Promise<boolean> {
    try {
      // Try to list voices as a health check
      await this.getAvailableVoices();
      return true;
    } catch (error) {
      console.error('Polly service not properly configured:', error);
      return false;
    }
  }
}