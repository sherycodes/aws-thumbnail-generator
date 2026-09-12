import { ImageIcon } from "lucide-react";

export function EmptyState() {
  return (
    <div className='flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center'>
      <ImageIcon
        className='size-8 text-muted-foreground/50'
        aria-hidden='true'
      />
      <p className='text-sm text-muted-foreground'>
        No images yet. Drop one above to get started.
      </p>
    </div>
  );
}
