"use client";

import { Progress } from "@/components/ui/progress";
import { useImagePolling } from "@/hooks/useImagePolling";
import { useUpload } from "@/hooks/useUpload";
import type { ImageDto } from "@/lib/types";
import { statusLabel } from "@/lib/utils";
import { Loader2Icon, UploadCloudIcon } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

interface UploadDropzoneProps {
  onReady: (image: ImageDto) => void;
}

export function UploadDropzone({ onReady }: UploadDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const { state: uploadState, upload, reset: resetUpload } = useUpload();
  const { result: pollResult, watch, stop: stopPolling } = useImagePolling();

  const busy =
    uploadState.phase === "signing" ||
    uploadState.phase === "uploading" ||
    (uploadState.phase === "done" && pollResult.phase === "waiting");

  const handleFile = useCallback(
    async (file: File) => {
      const imageId = await upload(file);
      if (imageId) watch(imageId);
    },
    [upload, watch]
  );

  useEffect(() => {
    if (pollResult.phase === "ready") {
      toast.success("Thumbnail ready", {
        description: pollResult.image.filename,
      });
      onReady(pollResult.image);
      resetUpload();
      stopPolling();
    } else if (pollResult.phase === "failed") {
      toast.error("Processing failed", { description: pollResult.message });
      resetUpload();
      stopPolling();
    } else if (pollResult.phase === "timeout") {
      toast.message("Still processing", {
        description: "Taking longer than expected -- check back shortly.",
      });
      resetUpload();
      stopPolling();
    }
  }, [pollResult, onReady, resetUpload, stopPolling]);

  useEffect(() => {
    if (uploadState.phase === "error") {
      toast.error("Upload failed", { description: uploadState.message });
      resetUpload();
    }
  }, [uploadState, resetUpload]);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !busy) void handleFile(file);
  }

  function onDragEnter(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function onDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    dragDepth.current -= 1;

    if (dragDepth.current <= 0) setDragging(false);
  }
  return (
    <label
      htmlFor={inputId}
      data-dragging={dragging || undefined}
      data-busy={busy || undefined}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className='flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-border 
                bg-card px-6 py-14 text-center transition-colors hover:border-foreground/30 
                data-busy:pointer-events-none data-busy:opacity-70 data-dragging:border-primary 
                data-dragging:bg-primary/5'
    >
      <input
        ref={inputRef}
        id={inputId}
        type='file'
        accept='image/jpeg,image/png,image/webp,image/gif'
        className='sr-only'
        onChange={onInputChange}
        disabled={busy}
      />{" "}
      {busy ? (
        <Loader2Icon
          className='size-7 animate-spin text-muted-foreground'
          aria-hidden='true'
        />
      ) : (
        <UploadCloudIcon
          className='size-7 text-muted-foreground'
          aria-hidden='true'
        />
      )}
      <div className='space-y-1'>
        <p className='text-sm font-medium'>
          {statusLabel(uploadState.phase, pollResult.phase)}
        </p>
        <p className='text-xs text-muted-foreground'>
          JPEG, PNG, Webp or GIF, up to 10&nbsp;MB
        </p>
      </div>
      {uploadState.phase === "uploading" && (
        <Progress value={uploadState.progress} className='w-full max-w-56' />
      )}
    </label>
  );
}
