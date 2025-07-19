// lib/file-upload-handler.ts (utility for API routes)
import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit } from "@/lib/stripe/usage-enforcement";
import { TablesInsert } from "@/lib/supabase/database.types";
import type { User } from "@supabase/supabase-js";

export interface FileUploadResult {
  success: boolean;
  file?: TablesInsert<"files">;
  error?: string;
  usageInfo?: {
    remaining: {
      uploads: number;
      storageGB: number;
    };
    planName: string;
  };
}

export async function handleFileUpload(
  user: User,
  file: File,
  filePath: string
): Promise<FileUploadResult> {
  const supabase = await createClient();

  // Check upload limit
  const uploadCheck = await checkUsageLimit(user.id, 'files', 1);
  if (!uploadCheck.allowed) {
    return {
      success: false,
      error: uploadCheck.error || 'Upload limit exceeded',
      usageInfo: uploadCheck.planName ? {
        remaining: {
          uploads: uploadCheck.remaining || 0,
          storageGB: uploadCheck.currentUsage?.storageGB || 0
        },
        planName: uploadCheck.planName
      } : undefined
    };
  }

  // Check storage limit
  const storageCheck = await checkUsageLimit(user.id, 'storage', file.size);
  if (!storageCheck.allowed) {
    return {
      success: false,
      error: storageCheck.error || 'Storage limit exceeded',
      usageInfo: storageCheck.planName ? {
        remaining: {
          uploads: storageCheck.currentUsage?.uploads || 0,
          storageGB: storageCheck.remaining || 0
        },
        planName: storageCheck.planName
      } : undefined
    };
  }

  try {
    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from("user-files")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Insert file metadata into the database
    const fileRecord: TablesInsert<"files"> = {
      user_id: user.id,
      filename: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
    };

    const { data: fileData, error: dbError } = await supabase
      .from("files")
      .insert(fileRecord)
      .select()
      .single();

    if (dbError) {
      // Clean up storage if database insert fails
      await supabase.storage
        .from("user-files")
        .remove([filePath]);
      throw dbError;
    }

    // Usage is automatically incremented by database trigger
    
    return {
      success: true,
      file: fileData,
      usageInfo: {
        remaining: {
          uploads: (uploadCheck.remaining || 0) - 1,
          storageGB: (storageCheck.remaining || 0) - (file.size / (1024 * 1024 * 1024))
        },
        planName: uploadCheck.planName || 'free'
      }
    };

  } catch (error) {
    console.error("Error in file upload handler:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}