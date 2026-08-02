import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Catches unexpected React render errors and shows a friendly fallback
 * instead of a blank screen.
 *
 * In production, the stack trace is not shown to users.
 * In development, the full error is displayed.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: message };
  }

  override componentDidCatch(error: unknown, info: { componentStack: string }): void {
    // Log in development only
    if (import.meta.env.MODE !== 'production') {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const isDev = import.meta.env.MODE !== 'production';

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-brand-900 px-4 py-16 text-center">
        <div className="text-5xl" aria-hidden="true">
          ⚠️
        </div>
        <h1 className="mt-6 text-2xl font-bold text-white">Something went wrong</h1>
        <p className="mt-3 max-w-sm text-sm text-brand-50/60">
          An unexpected error occurred. Please try refreshing the page.
        </p>
        {isDev && this.state.errorMessage && (
          <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-red-950 px-4 py-3 text-left text-xs text-red-200">
            {this.state.errorMessage}
          </pre>
        )}
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '' });
              window.location.reload();
            }}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500/90"
          >
            Refresh page
          </button>
          <Link
            to="/dashboard"
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '' });
            }}
            className="rounded-lg border border-brand-500/30 px-5 py-2.5 text-sm text-brand-50/80 hover:bg-brand-500/10"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }
}
