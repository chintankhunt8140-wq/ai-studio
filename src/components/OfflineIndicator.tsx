import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-indicator-banner"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/90 px-4 py-3 text-xs font-medium text-amber-200 shadow-2xl backdrop-blur-md md:bottom-6"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
        <WifiOff className="h-4 w-4" />
      </div>
      <div>
        <p className="font-bold text-amber-100">Offline Mode Active</p>
        <p className="text-[11px] text-amber-300/80">
          Viewing cached creations. New generations will queue once connection resumes.
        </p>
      </div>
    </div>
  );
};
