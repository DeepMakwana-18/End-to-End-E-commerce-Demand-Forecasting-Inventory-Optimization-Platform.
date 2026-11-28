import { cn } from '@/lib/utils';
import '@/styles/titan-mark.css';

export interface TitanMarkProps {
  size?: number;
  mode?: 'still' | 'orbit' | 'pulse' | 'spin';
  decorative?: boolean;
  className?: string;
}

/**
 * Reusable Titan AI orbit mark matching the landing page brand mark.
 * Uses `currentColor` so it adapts to light (#181B22) and dark/button (#ffffff) contexts.
 */
export function TitanMark({
  size = 28,
  mode = 'still',
  decorative = true,
  className,
}: TitanMarkProps) {
  const motionClass =
    mode === 'orbit' || mode === 'spin'
      ? 'orbit-motion'
      : mode === 'pulse'
        ? 'pulse-motion'
        : '';

  return (
    <svg
      className={cn(
        'titan',
        size <= 24 && 'sm',
        motionClass,
        className
      )}
      viewBox="0 0 48 48"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'Titan AI'}
    >
      <g className="orbit">
        <circle className="track" cx="24" cy="24" r="17" />
        <g className="sat" style={{ '--a': '-90deg' } as React.CSSProperties}>
          <circle className="ring" cx="24" cy="24" r="4" />
        </g>
        <g className="sat" style={{ '--a': '30deg' } as React.CSSProperties}>
          <circle className="ring" cx="24" cy="24" r="4" />
        </g>
        <g className="sat" style={{ '--a': '150deg' } as React.CSSProperties}>
          <circle className="ring" cx="24" cy="24" r="4" />
        </g>
      </g>
      <circle className="core" cx="24" cy="24" r="7" />
    </svg>
  );
}
