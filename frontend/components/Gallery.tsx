"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadDropzone } from "@/components/UploadDropzone";
import { ImageCard } from "@/components/ImageCard";
import { EmptyState } from "@/components/EmptyState";
import { deleteImage, listImages } from "@/lib/api";
import type { ImageDto } from "@/lib/types";

const GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4";

export function Gallery() {
  const [images, setImages] = useState<ImageDto[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    listImages()
      .then((res) => {
        setImages(res.items);
        setCursor(res.nextCursor);
      })
      .catch((err) => {
        toast.error("Could not load images", {
          description: err instanceof Error ? err.message : undefined,
        });
        setImages([]);
      });
  }, []);

  const handleReady = useCallback((image: ImageDto) => {
    setImages((prev) => [image, ...(prev ?? [])]);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const res = await listImages(24, cursor);
      setImages((prev) => [...(prev ?? []), ...res.items]);
      setCursor(res.nextCursor);
    } catch (err) {
      toast.error("Could not load more images", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoadingMore(false);
    }
  }, [cursor]);

  const handleDelete = useCallback(
    async (imageId: string) => {
      const snapshot = images;
      setImages((prev) =>
        (prev ?? []).filter((img) => img.imageId !== imageId)
      );
      try {
        await deleteImage(imageId);
      } catch (err) {
        setImages(snapshot ?? null);
        toast.error("Could not delete image", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [images]
  );

  return (
    <div className='flex flex-col gap-8'>
      <UploadDropzone onReady={handleReady} />
      {images === null ? (
        <div className={GRID}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className='aspect-square rounded-xl' />
          ))}
        </div>
      ) : images.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className={GRID}>
            {images.map((image) => (
              <ImageCard
                key={image.imageId}
                image={image}
                onDelete={handleDelete}
              />
            ))}
          </div>
          {cursor && (
            <Button
              variant='outline'
              onClick={handleLoadMore}
              disabled={loadingMore}
              className='mx-auto'
            >
              {loadingMore && <Loader2Icon className='animate-spin' />}
              Load more
            </Button>
          )}
        </>
      )}
    </div>
  );
}
