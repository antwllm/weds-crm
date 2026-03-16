import { useRef, useState, useCallback } from 'react';
import { Upload, Trash2, Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpload } from '@/hooks/useUpload';
import { toast } from 'sonner';

export interface TemplateAttachment {
  filename: string;
  gcsPath: string;
  url: string;
  mimeType: string;
  size: number;
}

interface AttachmentZoneProps {
  attachments: TemplateAttachment[];
  onAttachmentsChange: (attachments: TemplateAttachment[]) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function AttachmentZone({ attachments, onAttachmentsChange }: AttachmentZoneProps) {
  const { upload, uploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newAttachments: TemplateAttachment[] = [];

      for (const file of fileArray) {
        try {
          const result = await upload(file);
          newAttachments.push({
            filename: result.filename,
            gcsPath: result.gcsPath,
            url: result.url,
            mimeType: result.mimeType,
            size: result.size,
          });
        } catch (err) {
          toast.error(
            err instanceof Error
              ? err.message
              : `Erreur lors de l'upload de ${file.name}`,
          );
        }
      }

      if (newAttachments.length > 0) {
        onAttachmentsChange([...attachments, ...newAttachments]);
      }
    },
    [upload, attachments, onAttachmentsChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };

  const handleRemove = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick();
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 transition-colors cursor-pointer ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          {uploading
            ? 'Upload en cours...'
            : 'Glissez des fichiers ici ou cliquez pour ajouter'}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Attachment list */}
      {attachments.length > 0 && (
        <ul className="space-y-1">
          {attachments.map((att, index) => (
            <li
              key={`${att.gcsPath}-${index}`}
              className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{att.filename}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatFileSize(att.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={() => handleRemove(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
