import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}
