import { Component, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { TitanMark } from './TitanMark';
import '@/styles/startup-loader.css';

/** The mark is the same connected-nodes component used in the sidebar. */
function StartupBrand({ orbit }: { orbit: boolean }) {
  return (
    <>
      <div className="titan-startup-mark" aria-hidden="true">
        {orbit && (
          <svg className="titan-startup-orbit" viewBox="0 0 120 120" focusable="false">
            <circle cx="60" cy="60" r="55" />
          </svg>
        )}
        <TitanMark size={96} decorative className="titan-startup-logo" />
      </div>
      <div className="titan-startup-name">TITAN AI</div>
      <div className="titan-startup-subtitle">Supply Chain Intelligence</div>
    </>
  );
}

export function StartupLoader() {
  return (
    <div className="titan-startup-screen" role="status" aria-live="polite" aria-label="Opening your TITAN AI workspace">
      <div className="titan-startup-content">
        <StartupBrand orbit />
        <p className="titan-startup-status">Opening your workspace</p>
      </div>
    </div>
  );
}

interface ErrorState {
  failed: boolean;
}

/** A failed initial bundle must stop the orbit and offer a real reload retry. */
export class StartupErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, ErrorState> {
  state: ErrorState = { failed: false };

  static getDerivedStateFromError(): ErrorState {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('[Startup] Unable to open workspace:', error);
    document.getElementById('boot-loader')?.remove();
    this.props.onError();
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return createPortal(
      <div className="titan-startup-screen titan-startup-error" role="alert">
        <div className="titan-startup-content">
          <StartupBrand orbit={false} />
          <p className="titan-startup-status">We couldn’t open your workspace.</p>
          <button className="titan-startup-retry" type="button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>,
      document.body
    );
  }
}
