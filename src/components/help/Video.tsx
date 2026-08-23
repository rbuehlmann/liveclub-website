export function Video({ youtubeId, src, caption }: { youtubeId?: string; src?: string; caption?: string }) {
  return (
    <figure className="my-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
        {youtubeId ? (
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
            title={caption ?? "Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : src ? (
          <video className="aspect-video w-full" src={src} controls />
        ) : null}
      </div>
      {caption && <figcaption className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">{caption}</figcaption>}
    </figure>
  );
}
