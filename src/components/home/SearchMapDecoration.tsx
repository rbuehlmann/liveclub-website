// Purely decorative — radar-style concentric rings + a scatter of "club"
// dots around a pulsing pin, echoing "find a club near you" without
// tracing an actual geographic map (an abstract mark reads fine here and
// sidesteps ever having to keep a real map accurate). Pure inline SVG/CSS,
// no image asset, matching the rest of the homepage's built-not-photographed
// visuals. Desktop-only: the caller hides this below `lg`.
export function SearchMapDecoration() {
  const dots = [
    { x: 62, y: 58 },
    { x: 145, y: 40 },
    { x: 190, y: 95 },
    { x: 110, y: 130 },
    { x: 55, y: 145 },
    { x: 175, y: 150 },
  ];

  return (
    <div className="relative flex h-full min-h-[220px] items-center justify-center overflow-hidden">
      <svg viewBox="0 0 220 200" className="h-full w-full max-w-[280px]">
        {[88, 66, 44].map((r) => (
          <circle key={r} cx="110" cy="100" r={r} fill="none" stroke="var(--brand-red)" strokeOpacity="0.15" />
        ))}
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="3" fill="var(--brand-red)" fillOpacity="0.35" />
        ))}
        <circle cx="110" cy="100" r="16" fill="var(--brand-red)" fillOpacity="0.15" className="animate-pulse" />
        <circle cx="110" cy="100" r="6" fill="var(--brand-red)" />
      </svg>
    </div>
  );
}
