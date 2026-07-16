// Deterministic pseudo-random walk, seeded by a string, so each symbol
// always renders the same tiny sparkline instead of jumping on re-render.
function seededWalk(seed: string, points: number, trendUp: boolean) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const values: number[] = [];
  let v = 50;
  for (let i = 0; i < points; i++) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    const noise = ((hash % 1000) / 1000 - 0.5) * 18;
    const drift = (trendUp ? 1 : -1) * (i / points) * 14;
    v = 50 + drift + noise;
    values.push(v);
  }
  return values;
}

export function Sparkline({
  seed,
  positive,
  width = 72,
  height = 24,
}: {
  seed: string;
  positive: boolean;
  width?: number;
  height?: number;
}) {
  const values = seededWalk(seed, 16, positive);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <polyline
        points={points}
        stroke={positive ? "#22c55e" : "#737373"}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
