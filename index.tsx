
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationProvider } from './components/NotificationProvider';

// Polyfill for crypto.randomUUID to support insecure contexts (HTTP), alternative devices, and sandboxed iframes
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    (window as any).crypto = {} as any;
  }
  if (!window.crypto.randomUUID) {
    console.log("[Polyfill] Injecting robust fallback for crypto.randomUUID");
    window.crypto.randomUUID = function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    } as any;
  }

  // Graceful handler for unhandled promise rejections during async module loading
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason);
    if (reason.includes('client is offline') || reason.includes('connection_test')) {
      event.preventDefault(); // Suppress noisy offline probe errors
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
