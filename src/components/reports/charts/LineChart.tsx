"use client";

import {
  PointerEvent as ReactPointerEvent,
  KeyboardEvent,
  useMemo,
  useState,
} from "react";

export type LinePoint = { x: string; y: number; xLabel: string };

const WIDTH = 640;
const DEFAULT_HEIGHT = 220;
const PAD_LEFT = 92;
const PAD_RIGHT = 32;
const PAD_TOP = 24;
const PAD_BOTTOM = 28;
const PLOT_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT;
const MAX_X_LABELS = 8;
/** Minimum horizontal gap between two direct point labels before the
 * lower-priority one is dropped (its dot marker stays; see marks-and-anatomy.md
 * on colliding end-labels — the tooltip and table remain the fallback). */
const MIN_LABEL_GAP_PX = 56;
/** Below this plot height, 5 y-axis tick labels crowd each other — fall
 * back to 3 (0 / mid / max). */
const COMPACT_PLOT_HEIGHT = 100;

/** Smallest "clean" ceiling above `value` (0, or 1/2/5 × a power of ten). */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

/**
 * Single-series line: recessive horizontal grid only, 2px line in the brand
 * Primary colour, direct labels on max/min/last only, x-axis ticks
 * subsampled instead of rotated, crosshair + tooltip on hover and on
 * keyboard focus (arrow keys move the focused point).
 */
export function LineChart({
  points,
  formatValue,
  ariaLabel,
  height = DEFAULT_HEIGHT,
}: {
  points: LinePoint[];
  formatValue: (y: number) => string;
  ariaLabel: string;
  /** Chart height in the SVG's own units — width scales responsively regardless. */
  height?: number;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const plotHeight = height - PAD_TOP - PAD_BOTTOM;

  const maxY = useMemo(
    () => niceMax(Math.max(...points.map((p) => p.y), 0)),
    [points],
  );

  const xFor = (i: number) =>
    points.length <= 1
      ? PAD_LEFT + PLOT_WIDTH / 2
      : PAD_LEFT + (i / (points.length - 1)) * PLOT_WIDTH;
  const yFor = (y: number) => PAD_TOP + plotHeight - (y / maxY) * plotHeight;

  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(p.y).toFixed(2)}`,
    )
    .join(" ");

  const yTicks =
    plotHeight < COMPACT_PLOT_HEIGHT
      ? [0, maxY * 0.5, maxY]
      : [0, maxY * 0.25, maxY * 0.5, maxY * 0.75, maxY];

  const step = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));
  const lastIndex = points.length - 1;

  const maxIndex = points.reduce(
    (best, p, i) => (p.y > points[best].y ? i : best),
    0,
  );
  const minIndex = points.reduce(
    (best, p, i) => (p.y < points[best].y ? i : best),
    0,
  );
  // A dot marks all three (max, min, last), but the text label is dropped
  // for whichever collides with a higher-priority one already placed —
  // stacked/overlapping text is worse than one fewer label (the tooltip and
  // table still carry every value).
  const markedIndices = new Set([lastIndex, maxIndex, minIndex]);
  const labelPriority = [lastIndex, maxIndex, minIndex].filter(
    (i, pos, arr) => arr.indexOf(i) === pos,
  );
  const textLabeledIndices = new Set<number>();
  const placedX: number[] = [];
  for (const i of labelPriority) {
    const x = xFor(i);
    if (placedX.every((px) => Math.abs(px - x) >= MIN_LABEL_GAP_PX)) {
      textLabeledIndices.add(i);
      placedX.push(x);
    }
  }

  function moveToClientX(clientX: number, target: SVGRectElement) {
    const rect = target.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (relX - PAD_LEFT) / PLOT_WIDTH;
    const index = Math.round(ratio * (points.length - 1));
    setActiveIndex(Math.min(Math.max(index, 0), points.length - 1));
  }

  function handlePointerMove(e: ReactPointerEvent<SVGRectElement>) {
    moveToClientX(e.clientX, e.currentTarget);
  }

  function handleKeyDown(e: KeyboardEvent<SVGRectElement>) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActiveIndex((i) => Math.min((i ?? -1) + 1, lastIndex));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveIndex((i) => Math.max((i ?? lastIndex) - 1, 0));
    }
  }

  const active = activeIndex !== null ? points[activeIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="w-full"
        role="img"
        aria-label={ariaLabel}
      >
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 8}
              y={yFor(t)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-text-secondary text-[10px]"
            >
              {formatValue(t)}
            </text>
          </g>
        ))}

        {points.map((p, i) =>
          i % step === 0 || i === lastIndex ? (
            <text
              key={p.x}
              x={xFor(i)}
              y={height - 6}
              textAnchor="middle"
              className="fill-text-secondary text-[10px]"
            >
              {p.xLabel}
            </text>
          ) : null,
        )}

        <path
          d={linePath}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => {
          if (!markedIndices.has(i)) return null;
          const anchor = i === lastIndex ? "end" : i === 0 ? "start" : "middle";
          const textX =
            i === lastIndex ? xFor(i) + 4 : i === 0 ? xFor(i) - 4 : xFor(i);
          return (
            <g key={p.x}>
              <circle
                cx={xFor(i)}
                cy={yFor(p.y)}
                r={4}
                fill="var(--color-primary)"
                stroke="var(--color-surface)"
                strokeWidth={2}
              />
              {textLabeledIndices.has(i) && (
                <text
                  x={textX}
                  y={yFor(p.y) - 10}
                  textAnchor={anchor}
                  className="fill-text-primary text-[11px] font-medium"
                >
                  {formatValue(p.y)}
                </text>
              )}
            </g>
          );
        })}

        {active && activeIndex !== null && (
          <g>
            <line
              x1={xFor(activeIndex)}
              x2={xFor(activeIndex)}
              y1={PAD_TOP}
              y2={height - PAD_BOTTOM}
              stroke="var(--color-border-hover)"
              strokeWidth={1}
            />
            <circle
              cx={xFor(activeIndex)}
              cy={yFor(active.y)}
              r={4}
              fill="var(--color-primary)"
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          </g>
        )}

        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={PLOT_WIDTH}
          height={plotHeight}
          fill="transparent"
          tabIndex={0}
          className="cursor-crosshair focus-visible:outline-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActiveIndex(null)}
          onFocus={() => setActiveIndex((i) => i ?? lastIndex)}
          onBlur={() => setActiveIndex(null)}
          onKeyDown={handleKeyDown}
        />
      </svg>

      {active && activeIndex !== null && (
        <div
          className={`pointer-events-none absolute -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-app border border-border bg-surface px-3 py-2 text-xs shadow-soft-lg ${
            activeIndex === lastIndex
              ? "-translate-x-full"
              : activeIndex === 0
                ? "translate-x-0"
                : "-translate-x-1/2"
          }`}
          style={{
            left: `${(xFor(activeIndex) / WIDTH) * 100}%`,
            top: `${(yFor(active.y) / height) * 100}%`,
          }}
        >
          <p className="text-text-secondary">{active.xLabel}</p>
          <p className="num font-semibold text-text-primary">
            {formatValue(active.y)}
          </p>
        </div>
      )}
    </div>
  );
}
