import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
          <div className="bg-red-500/20 p-6 rounded-full mb-6">
            <AlertTriangle size={48} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-black mb-2">Algo deu errado</h1>
          <p className="text-slate-400 mb-8 max-w-sm">
            O sistema encontrou um erro inesperado. Nossos engenheiros foram notificados.
          </p>
          <div className="bg-slate-800 p-4 rounded-lg mb-6 text-left w-full max-w-md overflow-auto max-h-40">
            <code className="text-xs text-red-300 font-mono">
                {this.state.error?.toString()}
            </code>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-[#002776] hover:bg-blue-800 rounded-xl font-bold transition-all"
          >
            <RefreshCw size={18} /> Reiniciar Sistema
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}