import { useEffect, useState, type ReactNode } from 'react';
import { TitanMark } from '@/components/ui/TitanMark';
import { cn } from '@/lib/utils';

export interface AuthLayoutProps {
  children: ReactNode;
  centerOnDesktop?: boolean;
}

/**
 * Purely presentational split-screen layout for Titan AI authentication routes.
 * Desktop (lg+): ~55% ink (#0a0a0a) product showcase / ~45% paper (#fafaf9) auth area.
 * Stays mounted across /auth and /auth/register so the left showcase sequence runs once on entry.
 */
export function AuthLayout({ children, centerOnDesktop = false }: AuthLayoutProps) {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setSettled(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <div className="min-h-[100svh] bg-[#fafaf9] text-[#0a0a0a] font-sans grid grid-cols-1 lg:grid-cols-[55fr_45fr]">
      {/* Left Showcase Panel — Desktop (lg+) */}
      <aside
        aria-label="Titan AI overview"
        className={cn(
          'hidden lg:flex flex-col justify-start bg-[#0a0a0a] text-[#fafaf9] px-10 pt-10 pb-10 xl:px-14 xl:pt-12 xl:pb-12 border-r border-[#27272a]',
          settled && 'titan-showcase-settled'
        )}
      >
        {/* Top brand lockup */}
        <div className="inline-flex items-center gap-2.5 text-[#fafaf9]">
          <TitanMark size={30} decorative />
          <span className="text-[15px] font-extrabold uppercase tracking-[0.08em] leading-none">
            TITAN AI
          </span>
        </div>

        {/* Main copy + purposeful signal-to-decision diagram (fixed top anchor) */}
        <div className="mt-14 xl:mt-16 max-w-[540px]">
          <div className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.13em] text-[#a1a1aa]">
            <span className="inline-block w-6 h-[1.5px] bg-[#f59e0b]" aria-hidden="true" />
            <span>SUPPLY-CHAIN INTELLIGENCE</span>
          </div>

          <h1 className="mt-4 text-[32px] xl:text-[38px] font-bold tracking-[-0.025em] leading-[1.1] text-[#fafaf9]">
            From scattered signals to one clear move.
          </h1>

          <p className="mt-4 text-[16px] leading-[1.55] text-[#a1a1aa] max-w-[44ch]">
            Bring demand, inventory, and lead times together so your team can see risk and review the next action.
          </p>

          {/* Restrained outlined diagram panel */}
          <figure className="mt-8 rounded-[16px] border border-[#27272a] bg-[#111113] p-6">
            <div className="grid grid-cols-[auto_minmax(56px,1fr)_auto] items-center">
              {/* Three source labels */}
              <div className="flex flex-col justify-between h-[120px]">
                {(['Sales', 'Inventory', 'Lead times'] as const).map((signal, idx) => (
                  <div
                    key={signal}
                    style={{ '--signal-index': idx } as React.CSSProperties}
                    className="titan-signal-item flex items-center gap-2.5 rounded-[10px] border border-[#27272a] bg-[#18181b] px-3.5 h-[34px] text-[13px] font-medium text-[#fafaf9] whitespace-nowrap"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a1a1aa]" aria-hidden="true" />
                    <span>{signal}</span>
                  </div>
                ))}
              </div>

              {/* Continuous converging connector */}
              <svg
                viewBox="0 0 80 120"
                preserveAspectRatio="none"
                className="w-full h-[120px] text-[#52525b]"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M0 17 H36 V60"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  className="titan-connector-branch"
                  style={{ '--dash-len': 80 } as React.CSSProperties}
                />
                <path
                  d="M0 60 H36"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  className="titan-connector-branch"
                  style={{ '--dash-len': 36 } as React.CSSProperties}
                />
                <path
                  d="M0 103 H36 V60"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  className="titan-connector-branch"
                  style={{ '--dash-len': 80 } as React.CSSProperties}
                />
                <path
                  d="M36 60 H74"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  className="titan-connector-trunk"
                  style={{ '--dash-len': 38 } as React.CSSProperties}
                />
                <circle
                  cx="36"
                  cy="60"
                  r="3.5"
                  fill="#f59e0b"
                  className="titan-junction-dot"
                />
                <path
                  d="M71 56 L77 60 L71 64"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="titan-connector-arrow"
                />
              </svg>

              {/* Emphasized decision card */}
              <div className="titan-decision-card rounded-[14px] border border-[#3f3f46] bg-[#18181b] p-4 min-w-[196px] xl:min-w-[220px]">
                <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#fafaf9]">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#f59e0b]" aria-hidden="true" />
                  <span>Next move</span>
                </div>
                <p className="mt-2 text-[15px] font-semibold leading-[1.35] text-[#fafaf9]">
                  Review replenishment timing
                </p>
                <p className="mt-2 text-[12px] font-medium text-[#a1a1aa]">
                  Planner review required
                </p>
              </div>
            </div>

            <figcaption className="mt-4 pt-3 border-t border-[#27272a] text-[12px] text-[#a1a1aa]">
              Illustrative example
            </figcaption>
          </figure>
        </div>

        {/* Quiet bottom anchor */}
        <p className="mt-auto pt-10 text-[12px] text-[#a1a1aa]">
          Calm, explainable planning for supply-chain teams.
        </p>
      </aside>

      {/* Right Auth Panel — centered on Sign in (lg+), top-anchored on Create account */}
      <div
        className={cn(
          'titan-auth-right flex flex-col justify-start items-center px-4 sm:px-6 lg:px-8 xl:px-12',
          centerOnDesktop
            ? 'lg:justify-center lg:py-10'
            : 'lg:pt-14 xl:pt-16 lg:pb-12'
        )}
      >
        <div className="w-full max-w-[440px]">
          {/* Compact mobile/tablet brand header */}
          <header className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center gap-2.5 text-[#0a0a0a]">
              <TitanMark size={28} decorative />
              <span className="text-[15px] font-extrabold uppercase tracking-[0.08em] leading-none">
                TITAN AI
              </span>
            </div>
            <p className="mt-2 text-[14px] leading-[1.45] text-[#52525b] max-w-[38ch] mx-auto">
              Bring demand, inventory, and lead times together to review the next action.
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
              <span>Illustrative example</span>
            </div>
            <p className="mt-1.5 text-[14px] font-semibold text-[#0a0a0a]">
              Review replenishment timing
            </p>
            <p className="mt-0.5 text-[12px] text-[#52525b]">
              Sales, inventory, and lead times · Planner review required
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
