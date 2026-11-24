import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React boundary error:', error, errorInfo);
    const msg = error?.message || '';
    if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Loading chunk')) {
      const lastReload = sessionStorage.getItem('chunk_err_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
        sessionStorage.setItem('chunk_err_reload', String(now));
        window.location.reload();
      }
    }
  }

  private handleResetState = () => {
    (this as any).setState({ hasError: false, error: null });
  };

  private handleClearCacheAndReload = () => {
    try {
      sessionStorage.clear();
      // Keep key user credentials if present
      const activeUser = localStorage.getItem('active_user');
      localStorage.clear();
      if (activeUser) {
        localStorage.setItem('active_user', activeUser);
      }
    } catch (e) {
      console.error('Error clearing cache:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Lo sentimos, ha ocurrido un error inesperado de ejecución.';
      const rawErrorMsg = this.state.error?.message || '';
      
      try {
        // Check if it's a Firestore error JSON
        if (rawErrorMsg.startsWith('{')) {
          const errorData = JSON.parse(rawErrorMsg);
          if (errorData.error && errorData.operationType) {
            errorMessage = `Error de Base de Datos: No tiene permisos suficientes para realizar la operación de ${errorData.operationType} en ${errorData.path || 'la colección'}.`;
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      if (rawErrorMsg.includes('Failed to fetch dynamically imported module') || rawErrorMsg.includes('Loading chunk')) {
        errorMessage = 'Se ha actualizado el código de la aplicación. Por favor, recargue para obtener la versión más reciente.';
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans select-none">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl border border-slate-200 text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Punto de Control de Estabilidad</h1>
            <p className="text-slate-600 text-xs mb-4 leading-relaxed font-medium">{errorMessage}</p>
            
            {this.state.error && (
              <div className="text-left bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-[10.5px] overflow-auto max-h-40 border border-slate-800 mb-6 select-all">
                <p className="font-bold text-rose-400 mb-1">Detalle del Error: {this.state.error.message}</p>
                <pre className="whitespace-pre-wrap text-slate-400 text-[9.5px]">{this.state.error.stack}</pre>
              </div>
            )}

            <div className="space-y-2.5">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-[#0B3C5D] text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-900 transition-all shadow-md active:scale-98 cursor-pointer"
              >
                Recargar Aplicación
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={this.handleResetState}
                  className="py-2.5 bg-slate-200 text-slate-800 rounded-lg font-bold uppercase text-[9.5px] tracking-wider hover:bg-slate-300 transition-all cursor-pointer"
                >
                  Reintentar Vista
                </button>
                <button
                  onClick={this.handleClearCacheAndReload}
                  className="py-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold uppercase text-[9.5px] tracking-wider hover:bg-rose-100 transition-all cursor-pointer"
                >
                  Limpiar Caché
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
