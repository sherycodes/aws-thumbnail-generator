import { Gallery } from "@/components/Gallery";

export default function Home() {
  return (
    <main className='mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-6 py-16 sm:py-20'>
      <header className='space-y-2 text-center'>
        <h1 className='text-2xl font-semibold tracking-tight'>
          Thumbnail Generator
        </h1>
        <p className='text-sm text-muted-foreground'>
          Drop an image, watch it get resized to a 400px Webp thumbnail on AWS.
        </p>
      </header>
      <Gallery />
    </main>
  );
}
