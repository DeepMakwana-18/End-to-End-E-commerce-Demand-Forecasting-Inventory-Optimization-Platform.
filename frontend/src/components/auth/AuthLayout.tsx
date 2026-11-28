import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  FileCheck2,
  Info,
  Package,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { TitanMark } from '@/components/ui/TitanMark';
import { cn } from '@/lib/utils';

export interface AuthLayoutProps {
  children: ReactNode;
  centerOnDesktop?: boolean;
}

const AUTH_META_DESCRIPTION = 'Calm, explainable planning for supply-chain teams.';

const SIGNALS = [
  { label: 'Sales', value: '+48% demand', Icon: TrendingUp },
  { label: 'Inventory', value: '660 on hand', Icon: Package },
  { label: 'Lead times', value: '8-day lead', Icon: Clock },
] as const;

const TRUST_ITEMS = [
  { label: 'Human review stays in the loop', Icon: ShieldCheck },
  { label: 'No automated purchase orders', Icon: FileCheck2 },
  { label: 'Demo data is illustrative', Icon: Info },
] as const;

interface FlowGeometry {
  height: number;
  centers: [number, number, number];
}

/**
 * Split-screen layout for Titan AI authentication routes (/auth and /auth/register).
 * Desktop (lg+): sticky ink (#0a0a0a) showcase / independently scrollable paper (#fafaf9) form.
 * Stays mounted across /auth and /auth/register so the left showcase sequence runs once on entry.
 */
export function AuthLayout({ children, centerOnDesktop = false }: AuthLayoutProps) {
  const location = useLocation();
  const isSignup = location.pathname === '/auth/register';
  const [settled, setSettled] = useState(false);

  const signalsColRef = useRef<HTMLDivElement>(null);
  const signalRowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [flowGeo, setFlowGeo] = useState<FlowGeometry>({
    height: 176,
    centers: [26, 88, 150],
  });

  useEffect(() => {
    const meta = document.querySelector('meta[name="description"]');
    const prevContent = meta?.getAttribute('content') ?? null;
    if (meta) {
      meta.setAttribute('content', AUTH_META_DESCRIPTION);
    }
    return () => {
      if (meta && prevContent !== null) {
        meta.setAttribute('content', prevContent);
      }
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setSettled(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const col = signalsColRef.current;
    if (!col) return;

    const measure = () => {
      const colRect = col.getBoundingClientRect();
      if (colRect.height <= 0) return;
      const centers = [0, 1, 2].map((idx) => {
        const row = signalRowRefs.current[idx];
        if (!row) return (colRect.height / 3) * (idx + 0.5);
        const r = row.getBoundingClientRect();
        return r.top - colRect.top + r.height / 2;
      }) as [number, number, number];

      setFlowGeo((prev) => {
        const sameH = Math.abs(prev.height - colRect.height) < 0.5;
        const sameC = prev.centers.every((c, i) => Math.abs(c - centers[i]) < 0.5);
        if (sameH && sameC) return prev;
        return { height: colRect.height, centers };
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(col);
    signalRowRefs.current.forEach((row) => {
      if (row) ro.observe(row);
    });
    window.addEventListener('resize', measure, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const svgH = Math.max(120, Math.round(flowGeo.height));
  const cy = svgH / 2;
  const [y1, y2, y3] = flowGeo.centers;
  const nodeLeft = 10; // 32 (center) - 22 (44px circle radius)
  const nodeRight = 54; // 32 (center) + 22 (44px circle radius)

  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] lg:min-h-[640px] lg:overflow-hidden bg-[#fafaf9] text-[#0a0a0a] font-sans grid grid-cols-1 lg:grid-cols-[48fr_52fr] xl:grid-cols-[55fr_45fr]">
      {/* Left Showcase Panel — Desktop (lg+) */}
      <aside
        aria-label="Titan AI overview"
        className={cn(
          'titan-auth-left hidden lg:flex lg:sticky lg:top-0 lg:h-[100dvh] lg:overflow-hidden relative flex-col bg-[#0a0a0a] text-[#fafaf9] border-r border-white/[0.12]',
          settled && 'titan-showcase-settled'
        )}
      >
        {/* Faint 6-column structural lines */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 grid grid-cols-6"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-full border-r border-white/[0.05]',
                i === 5 && 'border-r-0'
              )}
            />
          ))}
        </div>

        {/* Bottom soft arc glow */}
        <div aria-hidden="true" className="titan-auth-arc-glow" />

        {/* Top brand lockup (first tab stop on /auth) */}
        <div className="relative z-10 shrink-0">
          <a
            href="/"
            className="titan-auth-brand-link inline-flex items-center gap-2.5 rounded-[8px] text-[#fafaf9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93c5fd]"
          >
            <TitanMark size={32} decorative className="titan-auth-brand-mark" />
            <span className="text-[15px] font-extrabold uppercase tracking-[0.08em] leading-none">
              TITAN AI
            </span>
          </a>
        </div>

        {/* Main vertically centered block */}
        <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-center py-4">
          <div className="w-full max-w-[640px]">
            {/* Eyebrow */}
            <div className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.13em] text-[#a1a1aa]">
              <span className="inline-block w-6 h-[1.5px] bg-[#f59e0b]" aria-hidden="true" />
              <span>SUPPLY-CHAIN INTELLIGENCE</span>
            </div>

            {/* Mode-aware headline + subtitle */}
            <div key={isSignup ? 'register' : 'login'} className="titan-auth-copy-swap">
              <h2 className="titan-auth-headline font-extrabold tracking-[-0.03em] leading-[1.05] text-white [text-wrap:balance]">
                {isSignup ? (
                  <>
                    <span className="titan-headline-line">
                      <span>Bring your sales CSV.</span>
                    </span>
                    <span className="titan-headline-line titan-headline-line--2">
                      <span>
                        See your <span className="titan-orange-underline">first next move.</span>
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="titan-headline-line">
                      <span>From scattered signals</span>
                    </span>
                    <span className="titan-headline-line titan-headline-line--2">
                      <span>
                        to <span className="titan-orange-underline">one clear move.</span>
                      </span>
                    </span>
                  </>
                )}
              </h2>

              <p className="titan-auth-subtitle text-[#a1a1aa] max-w-[46ch]">
                {isSignup
                  ? 'Upload a sales history, map your columns, and review your first forecast.'
                  : 'Bring demand, inventory, and lead times together so your team can see risk and review the next action.'}
              </p>
            </div>

            {/* Illustrative Signal-to-Decision Scene */}
            <div
              role="img"
              aria-label="Illustration: sales, inventory and lead-time signals merge into a recommended next move: order 900 units within the 3-day review window. Illustrative example."
              className="titan-scene-card w-full rounded-[20px] border border-white/[0.12] bg-[#111113]"
            >
              {/* Top example label */}
              <div
                aria-hidden="true"
                className="mb-4 font-mono text-[12px] uppercase tracking-[0.08em] text-[#a1a1aa]"
              >
                EXAMPLE · SKU-4471
              </div>

              <div
                aria-hidden="true"
                className="titan-scene-grid"
              >
                {/* Column 1: Signals */}
                <div ref={signalsColRef} className="titan-signals-col">
                  {SIGNALS.map(({ label, value, Icon }, idx) => (
                    <div
                      key={label}
                      ref={(el) => {
                        signalRowRefs.current[idx] = el;
                      }}
                      style={{ '--signal-index': idx } as React.CSSProperties}
                      className="titan-signal-item"
                    >
                      <span className="titan-signal-head">
                        <Icon className="w-4 h-4 text-[#a1a1aa] shrink-0" />
                        <span className="titan-signal-label">{label}</span>
                      </span>
                      <span className="titan-signal-value font-mono">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Column 2: Flow SVG (horizontal >= 1280px, vertical 1024-1279px) */}
                <div className="titan-flow-col">
                  {/* Desktop horizontal flow SVG */}
                  <svg
                    viewBox={`0 0 64 ${svgH}`}
                    style={{ height: `${svgH}px` }}
                    className="hidden xl:block w-[64px] overflow-visible"
                    fill="none"
                  >
                    <path
                      d={`M -12 ${y1} C -1 ${y1}, -1 ${cy}, ${nodeLeft} ${cy}`}
                      stroke="#52525b"
                      strokeWidth="1.5"
                      className="titan-flow-branch"
                      style={{ '--dash-len': 110 } as React.CSSProperties}
                    />
                    <path
                      d={`M -12 ${y2} L ${nodeLeft} ${cy}`}
                      stroke="#52525b"
                      strokeWidth="1.5"
                      className="titan-flow-branch"
                      style={{ '--dash-len': 36 } as React.CSSProperties}
                    />
                    <path
                      d={`M -12 ${y3} C -1 ${y3}, -1 ${cy}, ${nodeLeft} ${cy}`}
                      stroke="#52525b"
                      strokeWidth="1.5"
                      className="titan-flow-branch"
                      style={{ '--dash-len': 110 } as React.CSSProperties}
                    />
                    <path
                      d={`M ${nodeRight} ${cy} L 73 ${cy}`}
                      stroke="#52525b"
                      strokeWidth="1.5"
                      className="titan-flow-trunk"
                      style={{ '--dash-len': 24 } as React.CSSProperties}
                    />
                    <path
                      d={`M 68 ${cy - 4.5} L 75 ${cy} L 68 ${cy + 4.5}`}
                      stroke="#a1a1aa"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="titan-flow-arrow"
                    />
                    {/* Traveling orange dots */}
                    <circle
                      cx="-12"
                      cy={y1}
                      r="3"
                      fill="#f59e0b"
                      className="titan-flow-dot titan-flow-dot--1"
                      style={{ '--dy': `${(cy - y1).toFixed(1)}px` } as React.CSSProperties}
                    />
                    <circle
                      cx="-12"
                      cy={y2}
                      r="3"
                      fill="#f59e0b"
                      className="titan-flow-dot titan-flow-dot--2"
                      style={{ '--dy': `${(cy - y2).toFixed(1)}px` } as React.CSSProperties}
                    />
                    <circle
                      cx="-12"
                      cy={y3}
                      r="3"
                      fill="#f59e0b"
                      className="titan-flow-dot titan-flow-dot--3"
                      style={{ '--dy': `${(cy - y3).toFixed(1)}px` } as React.CSSProperties}
                    />
                    <circle
                      cx={nodeRight}
                      cy={cy}
                      r="3"
                      fill="#f59e0b"
                      className="titan-flow-dot titan-flow-dot--idle"
                    />
                  </svg>

                  {/* Tablet vertical flow SVG (1024-1279px) */}
                  <svg
                    viewBox="0 0 120 48"
                    className="xl:hidden w-[120px] h-[48px] overflow-visible"
                    fill="none"
                  >
                    <path
                      d="M60 0 V42"
                      stroke="#52525b"
                      strokeWidth="1.5"
                      className="titan-flow-trunk"
                      style={{ '--dash-len': 42 } as React.CSSProperties}
                    />
                    <path
                      d="M55 37 L60 44 L65 37"
                      stroke="#a1a1aa"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="titan-flow-arrow"
                    />
                  </svg>

                  {/* 44px Merge Node with 26px white orbit mark */}
                  <div className="titan-merge-node">
                    <TitanMark size={26} decorative className="titan-merge-mark" />
                  </div>
                </div>

                {/* Column 3: Next-move card */}
                <div className="titan-next-move-wrap">
                  <div className="titan-next-move-card rounded-[16px] border border-[#0a0a0a] bg-white p-5 text-[#0a0a0a]">
                    <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#0a0a0a]">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                      <span>NEXT MOVE</span>
                    </div>

                    <p className="mt-2 text-[18px] font-bold leading-[1.25] tracking-[-0.015em] text-[#0a0a0a]">
                      Order 900 units within the 3-day review window.
                    </p>

                    <div className="mt-3 flex items-center flex-nowrap gap-2">
                      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[#f1f1f3] px-2.5 py-1 text-[13px] font-semibold text-[#3f3f46]">
                        11 days cover
                      </span>
                      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[#f1f1f3] px-2.5 py-1 text-[13px] font-semibold text-[#3f3f46]">
                        8-day lead
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 whitespace-nowrap rounded-[10px] bg-[#f6f6f7] px-3 py-2 text-[13px] font-medium text-[#27272a]">
                      <ShieldCheck className="w-4 h-4 text-[#16a34a] shrink-0" />
                      <span>Planner review required</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Row */}
        <ul className="titan-trust-row relative z-10 shrink-0 pt-5 border-t border-white/[0.10] flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-center xl:gap-x-5 xl:gap-y-2 list-none m-0">
          {TRUST_ITEMS.map(({ label, Icon }) => (
            <li
              key={label}
              className="inline-flex items-center gap-2 text-[13px] font-medium text-[#a1a1aa]"
            >
              <Icon className="w-4 h-4 text-[#a1a1aa] shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Right Auth Panel — independently scrollable if taller than viewport */}
      <div
        className={cn(
          'titan-auth-right lg:h-[100dvh] lg:overflow-y-auto flex flex-col justify-start items-center px-4 sm:px-6 lg:px-8 xl:px-12',
          centerOnDesktop
            ? 'lg:justify-center'
            : 'lg:justify-start'
        )}
      >
        <div className="titan-auth-right-inner w-full max-w-[440px] flex flex-col min-h-full">
          <a
            href="/"
            className="mb-5 self-start inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d4d4d8] bg-white px-3 text-[14px] font-medium text-[#52525b] transition-colors hover:border-[#a1a1aa] hover:text-[#0a0a0a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e3fc8]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to landing page
          </a>

          {/* Compact mobile/tablet brand header (< 1024px) */}
          <header className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center gap-2.5 text-[#0a0a0a]">
              <TitanMark size={28} decorative />
              <span className="text-[15px] font-extrabold uppercase tracking-[0.08em] leading-none">
                TITAN AI
              </span>
            </div>
            <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.13em] text-[#52525b]">
              Supply-chain intelligence
            </p>
          </header>

          {children}

          {/* Compact mobile/tablet product summary below the form */}
          <section
            aria-label="Illustrative product summary"
            className="lg:hidden mt-6 rounded-[14px] border border-[#e4e4e7] bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-[#52525b]">
              <span className="inline-flex items-center gap-2 text-[#0a0a0a]">
                <span className="inline-block w-2 h-2 rounded-full bg-[#f59e0b]" aria-hidden="true" />
                Next move
              </span>
              <span>EXAMPLE · SKU-4471</span>
            </div>
            <p className="mt-1.5 text-[14px] font-semibold text-[#0a0a0a]">
              Order 900 units within the 3-day review window.
            </p>
            <p className="mt-0.5 text-[12px] text-[#52525b]">
              11 days cover · 8-day lead · Planner review required
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
