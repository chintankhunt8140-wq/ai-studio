import React from 'react';
import {
  Sparkles,
  FolderHeart,
  Sliders,
  Smartphone,
  User,
  Download,
} from 'lucide-react';
import { UserProfile } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface MobileNavBarProps {
  currentTab: 'studio' | 'library' | 'admin';
  onTabChange: (tab: 'studio' | 'library' | 'admin') => void;
  currentUser: UserProfile | null;
  onOpenUserModal: () => void;
  onOpenInstallModal: () => void;
  libraryCount: number;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  onOpenUserModal,
  onOpenInstallModal,
  libraryCount,
}) => {
  const { isInstalled } = usePWAInstall();

  return (
    <div
      id="mobile-bottom-navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-slate-950/95 pb-safe backdrop-blur-xl md:hidden"
    >
      <nav className="flex h-16 items-center justify-around px-2">
        {/* Tab 1: Studio */}
        <button
          id="mobile-nav-studio"
          onClick={() => onTabChange('studio')}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all ${
            currentTab === 'studio' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
              currentTab === 'studio' ? 'bg-cyan-500/20 text-cyan-400' : ''
            }`}
          >
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-semibold">Studio</span>
        </button>

        {/* Tab 2: Library */}
        <button
          id="mobile-nav-library"
          onClick={() => onTabChange('library')}
          className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all ${
            currentTab === 'library' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
              currentTab === 'library' ? 'bg-cyan-500/20 text-cyan-400' : ''
            }`}
          >
            <FolderHeart className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-semibold">Library</span>
          {libraryCount > 0 && (
            <span className="absolute top-1 right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[9px] font-bold text-black shadow-sm">
              {libraryCount}
            </span>
          )}
        </button>

        {/* Tab 3: Install App (Dedicated for iPhone & Android) */}
        <button
          id="mobile-nav-install"
          onClick={onOpenInstallModal}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 py-1 text-slate-300 transition-all hover:text-white"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400">
            <Smartphone className="h-4 w-4" />
            {!isInstalled && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold text-cyan-300">
            {isInstalled ? 'Installed' : 'Install'}
          </span>
        </button>

        {/* Tab 4: Engine / Admin */}
        <button
          id="mobile-nav-admin"
          onClick={() => onTabChange('admin')}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all ${
            currentTab === 'admin' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
              currentTab === 'admin' ? 'bg-cyan-500/20 text-cyan-400' : ''
            }`}
          >
            <Sliders className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-semibold">Engine</span>
        </button>

        {/* Tab 5: Account Profile */}
        <button
          id="mobile-nav-profile"
          onClick={onOpenUserModal}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-slate-400 transition-all hover:text-slate-200"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-[11px] font-bold text-white shadow-sm">
            {currentUser?.name?.slice(0, 1) || 'U'}
          </div>
          <span className="text-[10px] font-semibold truncate max-w-[50px]">
            {currentUser?.name?.split(' ')[0] || 'Profile'}
          </span>
        </button>
      </nav>
    </div>
  );
};
