"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";

import { StatusPill } from "@/components/StatusPill";
import type { ImageCardProps } from "@/lib/types";

export function ImageCard({ image, onDelete }: ImageCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <Card className='group/image-card relative aspect-square gap-0 overflow-hidden p-0'>
      <div className='absolute top-2 left-2 z-10'>
        <StatusPill status={image.status} />
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger
          render={
            <Button
              variant='secondary'
              size='icon-sm'
              className='absolute top-2 right-2 z-10 opacity-0 shadow-sm transition-opacity 
                        focus-visible:opacity-100 grouphover/image-card:opacity-100'
              aria-label={`Delete ${image.filename}`}
            />
          }
        >
          <Trash2Icon />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this image?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{image.filename}&rdquo; and its thumbnail will be
              permanently removed from S3 and DynamoDB. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => {
                onDelete(image.imageId);
                setDialogOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {image.thumbnailUrl ? (
        <img
          src={image.thumbnailUrl}
          alt={image.filename}
          className='size-full animate-in fade-in object-cover duration-300'
          loading='lazy'
        />
      ) : (
        <Skeleton className='size-full rounded-none' />
      )}
    </Card>
  );
}
