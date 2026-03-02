import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// ── Register ClipForge Service Worker (PWA + Share Target) ─────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.debug('[SW] Registered:', reg.scope);

        // Listen for messages from SW (share_target data)
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SHARE_TARGET') {
            // Store in sessionStorage so ShareTarget page can pick it up
            sessionStorage.setItem(
              'cf_share_intent',
              JSON.stringify({
                title: event.data.title || '',
                url:   event.data.url   || '',
                text:  event.data.text  || '',
              })
            );
          }
        });
      })
      .catch((err) => console.warn('[SW] Registration failed:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
