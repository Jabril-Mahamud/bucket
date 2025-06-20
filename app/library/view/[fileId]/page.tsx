import { FileViewer } from "@/components/file/file-viewer";

interface PageProps {
  params: Promise<{ fileId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { fileId } = await params;

  return (
    <div className="p-6">
      <FileViewer fileId={fileId} />;
    </div>
  );
}
