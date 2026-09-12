"use client";

import { useCallback, useRef, useState } from "react";
import { createUpload } from "@/lib/api";
import {
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  MIN_UPLOAD_BYTES,
} from "@/lib/types";

export type UploadState =
  | { phase: "idle" }
  | { phase: "signing" }
  | { phase: "uploading"; progress: number }
  | { phase: "done"; imageId: string }
  | { phase: "error"; message: string };

export function useUpload() {
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  const putWithProgress = useCallback(
    (
      url: string,
      body: FormData,
      onProgress: (pct: number) => void
    ): Promise<void> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("POST", url, true);
        // Never set Content-Type by hand here. The browser must generate the
        // multipart/form-data boundary itself; overriding it corrupts the body.
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`S3 rejected the upload (${xhr.status}).`));
        xhr.onerror = () =>
          reject(
            new Error(
              "Network error during upload. Check the bucket CORS rule."
            )
          );
        xhr.onabort = () => reject(new Error("Upload cancelled."));
        xhr.send(body);
      });
    },
    []
  );

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      const contentType = file.type.toLowerCase();
      if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType)) {
        const message = `${file.type || "That file type"} is not supported.`;
        setState({ phase: "error", message });
        return null;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        const message = "That file is larger than 10 MB.";
        setState({ phase: "error", message });
        return null;
      }
      if (file.size < MIN_UPLOAD_BYTES) {
        const message = "That file looks empty.";
        setState({ phase: "error", message });
        return null;
      }
      try {
        setState({ phase: "signing" });
        const presigned = await createUpload(file.name, contentType);
        const form = new FormData();
        for (const [key, value] of Object.entries(presigned.fields)) {
          form.append(key, value);
        }
        form.append("file", file);
        await putWithProgress(presigned.url, form, (progress) =>
          setState({ phase: "uploading", progress })
        );
        setState({ phase: "done", imageId: presigned.imageId });
        return presigned.imageId;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        setState({ phase: "error", message });
        return null;
      }
    },
    [putWithProgress]
  );

  const cancel = useCallback(() => {
    xhrRef.current?.abort();
    setState({ phase: "idle" });
  }, []);

  return {
    state,
    upload,
    reset,
    cancel,
  };
}
