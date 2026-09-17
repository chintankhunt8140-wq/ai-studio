import React, { useState } from 'react';
import {
  Smartphone,
  Share,
  PlusSquare,
  Download,
  CheckCircle2,
  X,
  ExternalLink,
  Sparkles,
  QrCode,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [selectedPlatform, setSelectedPlatform] = useState<'ios' | 'android'>(
    isIOS ? 'ios' : isAndroid ? 'android' : 'ios'
  );
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  // Generate dynamic QR code URL using quickchart / qr server for mobile scanning
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://ai.studio';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    currentUrl
  )}&bgcolor=090d16&color=38bdf8&margin=4`;

  return (
    <div
      id="pwa-install-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-80 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-purple-500/20 blur-3xl" />

        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">
                Install AI Studio App
              </h3>
              <p className="text-xs text-slate-400">
                Native mobile experience on iPhone and Android
              </p>
            </div>
          </div>
          <button
            id="close-install-modal-btn"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status notice if already installed */}
        {isInstalled ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="font-bold text-white">Already Installed!</p>
              <p className="text-slate-300">
                AI Studio is running as a standalone app on this device with full screen access.
              </p>
            </div>
          </div>
        ) : null}

        {/* Platform Selector Tabs */}
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/5 bg-slate-900/90 p-1.5">
          <button
            id="tab-select-iphone"
            onClick={() => setSelectedPlatform('ios')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${
              selectedPlatform === 'ios'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AppleIcon className="h-4 w-4" />
            <span>iPhone / iPad (iOS)</span>
          </button>
          <button
            id="tab-select-android"
            onClick={() => setSelectedPlatform('android')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${
              selectedPlatform === 'android'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AndroidIcon className="h-4 w-4" />
            <span>Android Phone</span>
          </button>
        </div>

        {/* Platform-Specific Step Guides */}
        <div className="mt-5 space-y-4">
          {selectedPlatform === 'ios' ? (
            /* iPhone (iOS Safari) Guide */
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-xs font-bold text-cyan-400">
                    1
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="font-semibold text-white">Open in Safari</span>: Open this link in Apple Safari on your iPhone or iPad.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-xs font-bold text-cyan-400">
                    2
                  </div>
                  <div className="text-xs text-slate-300">
                    Tap the <strong className="text-white">Share</strong> icon{' '}
                    <span className="inline-flex items-center justify-center rounded-md bg-white/10 p-1 text-cyan-400 align-middle">
                      <Share className="h-3 w-3" />
                    </span>{' '}
                    in the bottom Safari toolbar.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-xs font-bold text-cyan-400">
                    3
                  </div>
                  <div className="text-xs text-slate-300">
                    Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong>{' '}
                    <span className="inline-flex items-center justify-center rounded-md bg-white/10 p-1 text-cyan-400 align-middle">
                      <PlusSquare className="h-3 w-3" />
                    </span>
                    .
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-xs font-bold text-cyan-400">
                    4
                  </div>
                  <div className="text-xs text-slate-300">
                    Tap <strong className="text-white">Add</strong> in the top-right corner. AI Studio will appear as an app icon with instant offline caching and fullscreen canvas!
                  </div>
                </div>
              </div>

              {/* iOS Feature Highlights */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-900/40 p-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Full-Screen OLED View</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-900/40 p-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Zero Safari Toolbars</span>
                </div>
              </div>
            </div>
          ) : (
            /* Android (Chrome / Edge / Samsung) Guide */
            <div className="space-y-3">
              {isInstallable ? (
                <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/30 to-slate-900 p-4 text-center space-y-3">
                  <p className="text-xs text-slate-300">
                    Your Android browser supports instant 1-tap installation directly to your home screen and app drawer.
                  </p>
                  <button
                    id="install-android-native-btn"
                    onClick={handleNativeInstall}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg transition hover:brightness-110 active:scale-95"
                  >
                    <Download className="h-4 w-4" />
                    <span>Install AI Studio to Android</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-xs font-bold text-indigo-400">
                      1
                    </div>
                    <div className="text-xs text-slate-300">
                      Tap the <strong className="text-white">⋮ Menu</strong> button in Chrome or Samsung Internet.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-xs font-bold text-indigo-400">
                      2
                    </div>
                    <div className="text-xs text-slate-300">
                      Select <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-xs font-bold text-indigo-400">
                      3
                    </div>
                    <div className="text-xs text-slate-300">
                      Tap <strong className="text-white">Install</strong>. Android will create an APK launcher badge on your home screen.
                    </div>
                  </div>
                </div>
              )}

              {/* Android Highlights */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-900/40 p-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Adaptive Maskable Icon</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-900/40 p-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Native WebAPK Integration</span>
                </div>
              </div>
            </div>
          )}

          {/* Desktop QR Code Option */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-3.5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <QrCode className="h-4 w-4 text-cyan-400" />
                  <span>Scan to Open on iPhone / Android</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Open Camera on your mobile phone to install instantly.
                </p>
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900 p-1">
                <img
                  src={qrCodeUrl}
                  alt="Scan on Mobile"
                  className="h-16 w-16"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

// Subtle vector icons for Apple and Android
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 170 170" fill="currentColor">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-5.74-8.8-10.34-18.73-13.79-29.77-3.46-11.04-5.19-21.73-5.19-32.06 0-14.42 3.63-26.65 10.89-36.69 7.26-10.04 16.59-15.17 27.99-15.39 4.35 0 9.38 1.15 15.1 3.44 5.72 2.3 9.49 3.49 11.31 3.59 1.45 0 5.48-1.28 12.09-3.84 6.61-2.57 12.33-3.68 17.15-3.34 12.7.77 22.86 5.56 30.48 14.38-11.08 6.74-16.53 16.08-16.35 28.02.18 9.38 3.79 17.29 10.84 23.73 7.05 6.44 15.42 10.14 25.11 11.09-2.35 6.84-5.13 13.54-8.35 20.1zM119.22 33.39c0-6.72 2.45-13.23 7.35-19.53 4.9-6.3 11.04-10.74 18.42-13.32.73 4.67.65 9.36-.24 14.07-.89 4.71-2.88 9.24-5.97 13.58-3.09 4.34-6.84 7.74-11.25 10.2-4.41 2.46-8.84 3.8-13.29 4.02-.32-3.01-1.02-6.02-1.02-9.02z" />
    </svg>
  );
}

function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-4.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 2.23 12.95 2 12 2c-.96 0-1.86.23-2.66.63L7.85 1.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 4.26 6 5.92 6 7.8h12c0-1.88-.97-3.54-2.47-4.64zM10 5.5c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zm4 0c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75z" />
    </svg>
  );
}
