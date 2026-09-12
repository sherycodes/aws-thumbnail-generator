import { Badge } from "@/components/ui/badge";
import type { ImageStatus } from "@/lib/types";

export function StatusPill({ status }: { status: ImageStatus }) {
  if (status === "READY") return null;
  if (status === "FAILED") {
    return (
      <Badge
        variant='outline'
        className='border-transparent bg-destructive/15 text-destructive'
      >
        Failed
      </Badge>
    );
  }

  return (
    <Badge
      variant='outline'
      className='border-transparent bg-warning/15 text-warning'
    >
      Processing
    </Badge>
  );
}
