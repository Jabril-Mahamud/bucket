// app/library/view/[fileId]/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FileViewer } from "@/components/file";

interface PageProps {
  params: Promise<{ fileId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { fileId } = await params;
  
  // Check authentication
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect("/auth/login");
  }

  // Optional: Additional security - verify user owns this file
  const { data: fileData, error: fileError } = await supabase
    .from('files')
    .select('id')
    .eq('id', fileId)
    .eq('user_id', user.id)
    .single();

  if (fileError || !fileData) {
    redirect("/library"); // Redirect to library if file not found or not owned by user
  }

  return (
    <div className="min-h-screen">
      <FileViewer fileId={fileId} />
    </div>
  );
}