import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-navy-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full p-8 rounded-2xl bg-surface-1 border border-red-500/30 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-wide">
                Investigation Interface Recovered
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                An unexpected interface state occurred. The forensic database and backend engine remain fully operational.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-lg bg-black/50 border border-white/10 text-left font-mono text-[11px] text-red-300 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl bg-accent-gradient text-white text-xs font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Reset & Reload Portal
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/network'; }}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-300 text-xs font-medium hover:bg-white/15 transition-all flex items-center gap-2"
              >
                <Home className="w-4 h-4" /> Go to Network
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
