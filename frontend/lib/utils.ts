export { cn } from "cn";

export function statusLabel(uploadPhase: string, pollPhase: string): string {
  if (uploadPhase === "signing") return "Preparing upload…";
  if (uploadPhase === "uploading") return "Uploading…";
  if (uploadPhase === "done" && pollPhase === "waiting")
    return "Processing image…";
  return "Drop an image here, or click to browse";
}
