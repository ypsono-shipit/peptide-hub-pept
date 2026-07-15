// Stand-in for the spec's product photography — no real image asset, so
// this is an abstract glass-vial composition in the same visual language
// as the rest of the app (soft gradients, glass highlights).
export function VialIllustration() {
  return (
    <div className="relative flex h-full min-h-[120px] items-end justify-center gap-3">
      {[
        { h: 88, w: 30, tint: "#a3a3a3" },
        { h: 104, w: 34, tint: "#e5e5e5" },
        { h: 76, w: 26, tint: "#737373" },
      ].map((v, i) => (
        <svg key={i} width={v.w} height={v.h} viewBox={`0 0 ${v.w} ${v.h}`} className="drop-shadow-lg">
          <defs>
            <linearGradient id={`vial-glass-${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.35)" />
            </linearGradient>
            <linearGradient id={`vial-liquid-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={v.tint} stopOpacity="0.85" />
              <stop offset="100%" stopColor={v.tint} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <rect x={v.w * 0.3} y="0" width={v.w * 0.4} height={v.h * 0.16} rx="2" fill="rgba(255,255,255,0.6)" />
          <rect
            x="1"
            y={v.h * 0.16}
            width={v.w - 2}
            height={v.h * 0.84 - 1}
            rx={v.w * 0.18}
            fill={`url(#vial-glass-${i})`}
            stroke="rgba(255,255,255,0.5)"
          />
          <rect
            x="3"
            y={v.h * 0.45}
            width={v.w - 6}
            height={v.h * 0.52}
            rx={v.w * 0.14}
            fill={`url(#vial-liquid-${i})`}
          />
        </svg>
      ))}
    </div>
  );
}
