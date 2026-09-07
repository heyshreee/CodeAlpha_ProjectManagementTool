import type { CSSProperties } from 'react';

type LoaderHelixProps = {
  /** Total number of dots (multiple of 3). */
  linesCount?: number;
  /** Base animation perms in ms — lower is faster. */
  speed?: number;
  className?: string;
};

const DNA_COLORS = ['var(--color-brand-500)', 'var(--color-brand-300)'];

export default function LoaderHelix({
  linesCount = 12,
  speed = 1200,
  className = '',
}: LoaderHelixProps) {
  const perColumn = Math.max(1, Math.ceil(linesCount / 3));
  const columns = [0, 1, 2];

  return (
    <div
      data-slot="loader-dna"
      className={`grid grid-cols-3 justify-items-center items-start gap-x-1 ${className}`}
    >
      {columns.map((c) => (
        <div key={c} className="flex flex-col gap-1">
          {Array.from({ length: perColumn }).map((_, r) => {
            const parity = (c + r) % 2;
            const dotStyle: CSSProperties = {
              backgroundColor: DNA_COLORS[parity % DNA_COLORS.length],
              animation: `helix-loader-motion ${Math.round(speed * (c === 0 ? 1.6 : c === 1 ? 1 : 0.7))}ms linear infinite`,
              animationDelay: `${r * 130 + c * 45}ms`,
            };
            return (
              <span
                key={`${c}-${r}`}
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full"
                style={dotStyle}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}