import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <h4 className="font-bold text-sm mb-1">
            {this.props.fallbackTitle || 'Ocorreu um erro ao renderizar este componente'}
          </h4>
          <p className="text-xs text-red-600 font-mono">
            {this.state.error?.message || 'Erro inesperado'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

