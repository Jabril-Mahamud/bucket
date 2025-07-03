// lib/cloudconvert.ts
import CloudConvert from 'cloudconvert';

export interface ConversionResult {
  success: boolean;
  text?: string;
  error?: string;
}

export class CloudConvertService {
  private client: CloudConvert;

  constructor() {
    if (!process.env.CLOUDCONVERT_API_KEY) {
      throw new Error('CLOUDCONVERT_API_KEY environment variable is required');
    }
    this.client = new CloudConvert(process.env.CLOUDCONVERT_API_KEY);
  }

  /**
   * Convert a file to text using CloudConvert
   */
  async convertFileToText(file: File): Promise<ConversionResult> {
    try {
      // Determine the input format based on file type
      const inputFormat = this.getInputFormat(file.type);
      if (!inputFormat) {
        return {
          success: false,
          error: `Unsupported file type: ${file.type}`
        };
      }

      // Create conversion job
      const job = await this.client.jobs.create({
        tasks: {
          'import-file': {
            operation: 'import/upload'
          },
          'convert-to-text': {
            operation: 'convert',
            input: 'import-file',
            input_format: inputFormat,
            output_format: 'txt',
            options: {
              // Optimize text extraction
              ...(inputFormat === 'pdf' && {
                text_extraction: 'ocr_and_text',
                ocr_engine: 'tesseract',
                ocr_language: 'eng'
              })
            }
          },
          'export-text': {
            operation: 'export/url',
            input: 'convert-to-text'
          }
        }
      });

      // Upload the file
      const importTask = job.tasks.find(task => task.name === 'import-file');
      if (!importTask?.result?.form) {
        throw new Error('Failed to get upload form from CloudConvert');
      }

      const formData = new FormData();
      Object.entries(importTask.result.form.parameters).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append('file', file);

      const uploadResponse = await fetch(importTask.result.form.url, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Wait for conversion to complete
      const completedJob = await this.client.jobs.wait(job.id);
      
      // Get the export task result
      const exportTask = completedJob.tasks.find(task => task.name === 'export-text');
      if (!exportTask?.result?.files?.[0]?.url) {
        throw new Error('Failed to get converted text file URL');
      }

      // Download the converted text
      const textResponse = await fetch(exportTask.result.files[0].url);
      if (!textResponse.ok) {
        throw new Error(`Failed to download converted text: ${textResponse.statusText}`);
      }

      const text = await textResponse.text();

      return {
        success: true,
        text: text.trim()
      };

    } catch (error) {
      console.error('CloudConvert conversion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown conversion error'
      };
    }
  }

  /**
   * Get CloudConvert input format from MIME type
   */
  private getInputFormat(mimeType: string): string | null {
    const formatMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/rtf': 'rtf',
      'text/html': 'html',
      'text/markdown': 'md'
    };

    return formatMap[mimeType] || null;
  }

  /**
   * Check if a file type is supported for text conversion
   */
  static isSupportedFileType(mimeType: string): boolean {
    const supportedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/rtf',
      'text/html',
      'text/markdown'
    ];

    return supportedTypes.includes(mimeType);
  }
}