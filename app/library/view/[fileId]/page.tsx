// app/library/view/[fileId]/page.tsx
import { redirect } from "next/navigation";
import { FileViewer } from "@/components/file/file-viewer";
import { createClient } from "@/lib/supabase/client";

interface PageProps {
  params: Promise<{ fileId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { fileId } = await params;
  
  return (
    <div className="min-h-screen">
      <FileViewer fileId={fileId} />
    </div>
  );
}