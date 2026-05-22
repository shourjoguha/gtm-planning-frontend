// Centralized chart palette.
// Reads CSS custom properties so plotly/recharts traces stay in sync with
// light/dark mode without rebuilding.

function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function hsl(name: string, fallback: string, alpha?: number): string {
  const triplet = readVar(name, fallback);
  return alpha === undefined ? `hsl(${triplet})` : `hsla(${triplet} / ${alpha})`;
}

export function chartColor(slot: 1 | 2 | 3 | 4 | 5 | 6, alpha?: number): string {
  const fallbacks: Record<number, string> = {
    1: "158 52% 28%",
    2: "224 22% 12%",
    3: "220 9% 46%",
    4: "158 32% 52%",
    5: "220 13% 75%",
    6: "32 80% 45%",
  };
  return hsl(`--chart-${slot}`, fallbacks[slot], alpha);
}

export const CHART_PALETTE = [
  () => chartColor(1),
  () => chartColor(2),
  () => chartColor(3),
  () => chartColor(4),
  () => chartColor(5),
  () => chartColor(6),
];

export const chartAccent = () => chartColor(1);
export const chartInk = () => chartColor(2);
export const chartMuted = () => chartColor(3);

export function chartLayout() {
  // Plotly default layout snippet shared across all charts.
  return {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: {
      family: "Inter, system-ui, -apple-system, sans-serif",
      size: 12,
      color: hsl("--muted-foreground", "220 9% 46%"),
    },
    margin: { l: 56, r: 24, t: 24, b: 40 },
    xaxis: {
      gridcolor: hsl("--border", "30 10% 90%", 0.6),
      zerolinecolor: hsl("--border", "30 10% 90%"),
      tickfont: { size: 11 },
    },
    yaxis: {
      gridcolor: hsl("--border", "30 10% 90%", 0.6),
      zerolinecolor: hsl("--border", "30 10% 90%"),
      tickfont: { size: 11 },
    },
    legend: {
      orientation: "h" as const,
      yanchor: "bottom" as const,
      y: 1.02,
      xanchor: "left" as const,
      x: 0,
      font: { size: 11 },
    },
    hoverlabel: {
      bgcolor: hsl("--popover", "0 0% 100%"),
      bordercolor: hsl("--border", "30 10% 90%"),
      font: { color: hsl("--foreground", "224 22% 12%") },
    },
  };
}
