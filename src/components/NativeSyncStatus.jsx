/**
 * NativeSyncStatus.jsx — Klip4ge Platform Sync Settings Card
 * ─────────────────────────────────────────────────────────────
 * Shows in the Settings / Integrations page.
 *
 * Displays:
 *   • Current platform (PWA / iOS native / Android native)
 *   • Hidden in-app browser status (available / web-only fallback)
 *   • Background sync: last run, queued items, handler list
 *   • Manual sync trigger button
 *   • Install-as-app banner when running as PWA (not installed)
 *
 * Usage:
 *   import NativeSyncStatus from '@/components/NativeSyncStatus';
 *   <NativeSyncStatus />
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone, RefreshCw, Wifi, WifiOff, Zap,
  CheckCircle2, XCircle, Clock, Download, ChevronDown,
  ChevronUp, Info, Globe, Monitor,
} from 'lucide-react';
import { usePlatformSync } from '@/hooks/usePlatformSync.js';
import { isNative, getPlatform } from '@/lib/inAppBrowser.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString) {
  if (!isoString) return 'Never';
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 60_000)   return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function platformIcon(platform) {
  if (platform === 'ios' || platform === 'android') return <Smartphone size={14} />;
  if (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches)
    return <Download size={14} />;
  return <Globe size={14} />;
}

function platformLabel(platform) {
  if (platform === 'ios')     return 'iOS Native';
  if (platform === 'android') return 'Android Native';
  if (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches)
    return 'PWA (Installed)';
  return 'PWA (Browser)';
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NativeSyncStatus({ className = '' }) {
  const { syncStatus, triggerManualSync, isSyncing, lastSyncTime, syncError } = usePlatformSync();

  const [expanded,    setExpanded]    = useState(false);
  const [triggering,  setTriggering]  = useState(false);
  const [triggerMsg,  setTriggerMsg]  = useState('');

  const platform    = getPlatform();
  const native      = isNative();
  const isInstalled = typeof window !== 'undefined' &&
                      window.matchMedia?.('(display-mode: standalone)').matches;

  // ── Manual sync handler ────────────────────────────────────────────────────
  const handleManualSync = useCallback(async () => {
    if (triggering || isSyncing) return;
    setTriggering(true);
    setTriggerMsg('');

    try {
      await triggerManualSync();
      setTriggerMsg('Sync complete ✓');
    } catch (err) {
      setTriggerMsg(`Sync failed: ${err.message}`);
    } finally {
      setTriggering(false);
      setTimeout(() => setTriggerMsg(''), 4000);
    }
  }, [triggering, isSyncing, triggerManualSync]);

  // ── Derive status badge ────────────────────────────────────────────────────
  const statusBadge = (() => {
    if (isSyncing || triggering) {
      return { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Syncing…', icon: <RefreshCw size={12} className="animate-spin" /> };
    }
    if (syncError) {
      return { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Error', icon: <XCircle size={12} /> };
    }
    if (syncStatus?.lastSync) {
      return { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Active', icon: <CheckCircle2 size={12} /> };
    }
    return { color: 'text-gray-400', bg: 'bg-gray-400/10', label: 'Idle', icon: <Clock size={12} /> };
  })();

  return (
    <div className={`rounded-xl border border-[#2A2D3A] bg-[#13151F] overflow-hidden ${className}`}>

      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-[#1A1D27] transition-colors text-left"
        aria-expanded={expanded}
      >
        {/* Platform icon */}
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00BFFF]/20 to-[#9370DB]/20 flex items-center justify-center text-[#00BFFF]">
          {platformIcon(platform)}
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Platform Sync</span>
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusBadge.bg} ${statusBadge.color}`}>
              {statusBadge.icon}
              {statusBadge.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[#8B8D97] flex items-center gap-1">
              {platformIcon(platform)}
              {platformLabel(platform)}
            </span>
            {syncStatus?.lastSync && (
              <span className="text-xs text-[#8B8D97]">
                · Last sync {formatRelativeTime(syncStatus.lastSync)}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <span className="text-[#8B8D97]">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* ── Expanded details ─────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-[#2A2D3A] pt-4">

              {/* ── Stats grid ──────────────────────────────────────────────── */}
              <div className="grid grid-cols-3 gap-3">
                <StatTile
                  icon={<Zap size={14} className="text-[#00BFFF]" />}
                  label="In-App Browser"
                  value={native ? 'Native WebView' : 'Fetch fallback'}
                  sub={native ? 'Full session access' : 'Public pages only'}
                />
                <StatTile
                  icon={<Clock size={14} className="text-purple-400" />}
                  label="Background Sync"
                  value={native ? 'Native (15–60m)' : 'Foreground poll'}
                  sub={`${syncStatus?.queuedItems ?? 0} queued`}
                />
                <StatTile
                  icon={<Wifi size={14} className="text-green-400" />}
                  label="Handlers"
                  value={syncStatus?.handlerCount ?? 0}
                  sub={(syncStatus?.handlers ?? []).join(', ') || 'None registered'}
                />
              </div>

              {/* ── Error banner ─────────────────────────────────────────────── */}
              {syncError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-300">{syncError}</p>
                </div>
              )}

              {/* ── PWA install hint (when in browser, not installed) ─────────── */}
              {!native && !isInstalled && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-[#00BFFF]/5 border border-[#00BFFF]/20">
                  <Info size={14} className="text-[#00BFFF] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-[#00BFFF] mb-1">
                      Install Klip4ge for better sync
                    </p>
                    <p className="text-xs text-[#8B8D97]">
                      <strong className="text-white">Android:</strong> Chrome menu → Add to Home Screen<br />
                      <strong className="text-white">iOS:</strong> Safari Share → Add to Home Screen
                    </p>
                    <p className="text-xs text-[#8B8D97] mt-1">
                      Installed PWA gets background sync, share-sheet integration, and offline saves.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Native upgrade hint (when PWA is installed, not native) ────── */}
              {!native && isInstalled && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <Smartphone size={14} className="text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-purple-300 mb-1">
                      Native app coming soon
                    </p>
                    <p className="text-xs text-[#8B8D97]">
                      The full native Klip4ge app will unlock background Facebook sync,
                      hidden in-app browser, and real-time share detection — no Chrome
                      extension required.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Manual sync button ───────────────────────────────────────── */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleManualSync}
                  disabled={triggering || isSyncing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E2030] border border-[#2A2D3A]
                             text-sm text-white hover:bg-[#252840] disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors"
                >
                  <RefreshCw size={14} className={triggering || isSyncing ? 'animate-spin' : ''} />
                  {triggering || isSyncing ? 'Syncing…' : 'Sync now'}
                </button>

                {/* Feedback message */}
                <AnimatePresence>
                  {triggerMsg && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-[#8B8D97]"
                    >
                      {triggerMsg}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── StatTile sub-component ────────────────────────────────────────────────────

function StatTile({ icon, label, value, sub }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-[#0F1117] border border-[#2A2D3A]">
      <div className="flex items-center gap-1.5 text-[#8B8D97]">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white leading-tight">{value}</p>
      {sub && <p className="text-xs text-[#8B8D97] truncate" title={sub}>{sub}</p>}
    </div>
  );
}
