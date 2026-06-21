import React, { ErrorInfo, ReactNode } from 'react';
import * as Icons from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
    // Reset view state
    window.location.reload();
  };

  public render() {
    const self = this as any;
    if (self.state.hasError) {
      if (self.props.fallback) {
        return self.props.fallback;
      }
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 text-slate-100 min-h-[300px]">
          <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Icons.AlertTriangle className="w-12 h-12" />
          </div>
          <div className="text-center space-y-2 max-w-md">
            <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
            <p className="text-xs text-slate-400">
              A runtime crash occurred in this workspace view. Your SQLite project files remain safe and untouched.
            </p>
            {self.state.error && (
              <pre className="p-3 bg-black/40 border border-white/5 rounded-lg font-mono text-[10px] text-rose-300 max-h-32 overflow-auto text-left w-full break-all">
                {self.state.error.stack || self.state.error.message}
              </pre>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="btn-secondary py-2 px-4 flex items-center gap-2 text-xs cursor-pointer active:scale-95 transition-all"
          >
            <Icons.RefreshCw className="w-4 h-4" />
            <span>Restart Workspace View</span>
          </button>
        </div>
      );
    }

    return self.props.children;
  }
}
