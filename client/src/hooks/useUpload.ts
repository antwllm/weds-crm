import { useState, useCallback } from 'react';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  gcsPath: string;
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(async (file: File): Promise<UploadResult> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur upload' }));
        throw new Error(err.error || `Upload echoue (${res.status})`);
      }

      return await res.json();
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading };
}
