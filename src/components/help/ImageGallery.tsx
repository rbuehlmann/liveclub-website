"use client";

import { useState } from "react";

interface GalleryImage {
  src: string;
  caption?: string;
}

// Lightbox is deliberately just click-to-open/click-to-close — no
// prev/next arrows or keyboard nav yet, matching how small the demo
// content is today. Easy to extend once a real article needs it.
export function ImageGallery({ images }: { images: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex !== null ? images[openIndex] : null;

  return (
    <>
      <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt={img.caption ?? ""} className="h-32 w-full object-cover" />
          </button>
        ))}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out flex-col items-center justify-center gap-3 bg-black/80 p-4"
          onClick={() => setOpenIndex(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.src} alt={open.caption ?? ""} className="max-h-[80vh] max-w-full rounded-lg object-contain" />
          {open.caption && <p className="text-sm text-white/80">{open.caption}</p>}
        </div>
      )}
    </>
  );
}
