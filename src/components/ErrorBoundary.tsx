import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public handleSoftReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100/90 text-slate-800 flex items-center justify-center p-4 font-vazir dir-rtl" dir="rtl">
          <div className="bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-right">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-lg font-black text-slate-900">
                {this.props.fallbackTitle || 'خطایی در بارگذاری یا پردازش رخ داد'}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                سامانه انبارمه مانع از متوقف شدن برنامه شد. می‌توانید با تلاش مجدد یا بارگذاری مجدد صفحه، به کار خود ادامه دهید.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200 text-left dir-ltr max-h-36 overflow-y-auto">
                <p className="text-rose-700 font-mono text-[11px] font-bold break-all">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleSoftReset}
                className="w-full sm:flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-200"
              >
                <RotateCcw className="w-4 h-4" />
                <span>تلاش مجدد</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>بارگذاری مجدد صفحه</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
