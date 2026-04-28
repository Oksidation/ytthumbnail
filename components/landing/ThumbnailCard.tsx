/**
 * Pure-CSS placeholder thumbnail. Used in the landing-page hero and gallery
 * until we ship real generated samples. Renders at the YouTube 16:9 ratio.
 */
export function ThumbnailCard({
  title,
  badge,
  fromColor,
  toColor,
  align = "left",
}: {
  title: string;
  badge?: string;
  fromColor: string;
  toColor: string;
  align?: "left" | "right" | "center";
}) {
  const alignClass =
    align === "right"
      ? "items-end text-right"
      : align === "center"
        ? "items-center text-center"
        : "items-start text-left";

  return (
    <div
      className="relative aspect-video overflow-hidden rounded-xl border border-white/10 shadow-2xl"
      style={{
        background: `linear-gradient(135deg, ${fromColor} 0%, ${toColor} 100%)`,
      }}
    >
      <div className="absolute inset-0 bg-black/15" />
      <div className={`absolute inset-0 flex flex-col justify-end p-4 ${alignClass}`}>
        {badge ? (
          <span className="mb-2 rounded-md bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
            {badge}
          </span>
        ) : null}
        <h4 className="text-2xl font-black uppercase leading-none tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
          {title}
        </h4>
      </div>
    </div>
  );
}
