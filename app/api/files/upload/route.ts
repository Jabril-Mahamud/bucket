// app/api/files/upload/route.ts - New comprehensive file upload endpoint
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkUsageLimit, incrementUsage } from "@/lib/stripe/usage-enforcement";
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

    // Validate file size (max 100MB)
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxFileSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 100MB.' 
      }, { status: 400 });
    }

    // Check upload usage limit BEFORE processing
    const uploadCheck = await checkUsageLimit(user.id, 'files', 1);
    if (!uploadCheck.allowed) {
      return NextResponse.json({ 
        error: uploadCheck.error,
        errorType: 'UPLOAD_LIMIT_EXCEEDED',
        usageInfo: {
          currentUsage: uploadCheck.currentUsage,
          limits: uploadCheck.limits,
          planName: uploadCheck.planName,
          remaining: uploadCheck.remaining
        }
      }, { status: 429 });
    }

    // Check storage limit
    const storageCheck = await checkUsageLimit(user.id, 'storage', file.size);
    if (!storageCheck.allowed) {
      return NextResponse.json({ 
        error: storageCheck.error,
        errorType: 'STORAGE_LIMIT_EXCEEDED',
        usageInfo: {
          currentUsage: storageCheck.currentUsage,
          limits: storageCheck.limits,
          planName: storageCheck.planName,
          remaining: storageCheck.remaining
        }
      }, { status: 429 });
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/${timestamp}-${sanitizedFilename}`;

    try {
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

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
        console.error('Database insert error:', dbError);
        // Clean up storage if database insert fails
        await supabase.storage
          .from("user-files")
          .remove([filePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Usage is automatically incremented by database trigger
      // But we can also track it manually for immediate feedback
      await incrementUsage(user.id, 'files', 1, file.size);

      // Get updated usage info for response
      const updatedUploadCheck = await checkUsageLimit(user.id, 'files', 0);
      const updatedStorageCheck = await checkUsageLimit(user.id, 'storage', 0);

      return NextResponse.json({
        success: true,
        file: fileData,
        message: 'File uploaded successfully',
        usageInfo: {
          remaining: {
            files: updatedUploadCheck.remaining || 0,
            storageGB: updatedStorageCheck.remaining || 0
          },
          current: {
            totalFiles: updatedUploadCheck.currentUsage?.totalFiles || 0,
            storageGB: updatedStorageCheck.currentUsage?.storageGB || 0
          },
          limits: {
            maxFiles: updatedUploadCheck.limits?.maxFiles || 0,
            storageGB: updatedStorageCheck.limits?.storageGB || 0
          },
          planName: uploadCheck.planName || 'free'
        }
      });

    } catch (error) {
      console.error('File upload process error:', error);
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'File upload failed',
        errorType: 'UPLOAD_FAILED'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      errorType: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}