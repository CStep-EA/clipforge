import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// ── Service Worker registration & update strategy ───────────────────────────
// Roadmap item 4.4: Stale-While-Revalidate + user-prompted SKIP_WAITING
// ────────────────────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.debug('[SW] Registered:', reg.scope);

        // ── Listen for messages from SW (share_target data) ──────────────────
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

        // ── Update detection: notify user when a new SW version is waiting ───
        // This fires when the new SW has finished installing but is waiting
        // to take control (because we no longer call skipWaiting() on install).
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // A new version is ready — show a non-blocking toast
              console.log('[ClipForge] New version available — prompting user');
              showUpdateToast(reg);
            }
          });
        });

        // ── Handle the case where SW controller changed after SKIP_WAITING ───
        // Force-reload so the new SW takes over all open tabs simultaneously
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          console.debug('[SW] Controller changed — reloading for new version');
          window.location.reload();
        });
      })
      .catch((err) => console.warn('[SW] Registration failed:', err));
  });
}

/**
 * showUpdateToast
 * Creates a minimal DOM toast (no React dependency) that prompts the user
 * to refresh when a new ClipForge version is available.
 * The toast self-dismisses after 30 s if ignored.
 *
 * @param {ServiceWorkerRegistration} reg
 */
function showUpdateToast(reg) {
  // Avoid duplicate toasts
  if (document.getElementById('cf-update-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'cf-update-toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  toast.style.cssText = [
    'position:fixed',
    'bottom:80px',           // above mobile nav bar
    'left:50%',
    'transform:translateX(-50%)',
    'background:#1A1D27',
    'border:1px solid #2A2D3A',
    'border-radius:12px',
    'padding:12px 16px',
    'display:flex',
    'align-items:center',
    'gap:12px',
    'box-shadow:0 4px 24px rgba(0,0,0,0.5)',
    'z-index:9999',
    'font-family:system-ui,sans-serif',
    'font-size:14px',
    'color:#E8E8ED',
    'max-width:calc(100vw - 32px)',
    'animation:cf-slide-up 0.3s ease',
  ].join(';');

  // Inject keyframe animation once
  if (!document.getElementById('cf-update-toast-style')) {
    const style = document.createElement('style');
    style.id = 'cf-update-toast-style';
    style.textContent = `
      @keyframes cf-slide-up {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  toast.innerHTML = `
    <span style="font-size:18px" aria-hidden="true">✨</span>
    <span style="flex:1">New version of ClipForge is ready.</span>
    <button
      id="cf-update-refresh-btn"
      style="background:linear-gradient(135deg,#00BFFF,#9370DB);color:#fff;border:none;
             border-radius:8px;padding:6px 14px;font-size:13px;font-weight:600;
             cursor:pointer;white-space:nowrap"
      aria-label="Refresh to update ClipForge"
    >Refresh</button>
    <button
      id="cf-update-dismiss-btn"
      style="background:transparent;border:none;color:#8B8D97;cursor:pointer;
             font-size:18px;line-height:1;padding:0 4px"
      aria-label="Dismiss update notification"
    >×</button>
  `;

  document.body.appendChild(toast);

  // ── Refresh button: send SKIP_WAITING to the waiting SW ──────────────────
  document.getElementById('cf-update-refresh-btn').addEventListener('click', () => {
    reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
    toast.remove();
  });

  // ── Dismiss button ────────────────────────────────────────────────────────
  document.getElementById('cf-update-dismiss-btn').addEventListener('click', () => {
    toast.remove();
  });

  // ── Auto-dismiss after 30 s ───────────────────────────────────────────────
  setTimeout(() => toast.remove(), 30_000);
}

// ── React root ──────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
