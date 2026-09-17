import React from 'react';
import {
  Sparkles,
  Film,
  Image as ImageIcon,
  FolderHeart,
  Sliders,
  ShieldCheck,
  User,
  Zap,
  Smartphone,
} from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  currentTab: 'studio' | 'library' | 'admin';
  onTabChange: (tab: 'studio' | 'library' | 'admin') => void;
  currentUser: UserProfile | null;
  onOpenUserModal: () => void;
  onOpenInstallModal: () => void;
  hasGeminiKey: boolean;
  libraryCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  onOpenUserModal,
  onOpenInstallModal,
  hasGeminiKey,
  libraryCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-500 shadow-lg shadow-cyan-500/20">
            <Sparkles className="h-5 w-5 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-bold tracking-tight text-white">
                AI Studio
              </span>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                Brain v3
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              Neural Image &amp; 10s Video Synthesis
            </p>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/90 p-1">
          <button
            id="nav-tab-studio"
            onClick={() => onTabChange('studio')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              currentTab === 'studio'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Studio</span>
          </button>

          <button
            id="nav-tab-library"
            onClick={() => onTabChange('library')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              currentTab === 'library'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderHeart className="h-3.5 w-3.5" />
            <span>Library</span>
            {libraryCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold text-white">
                {libraryCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-admin"
            onClick={() => onTabChange('admin')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              currentTab === 'admin'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Engine</span>
          </button>
        </nav>

        {/* User profile & status */}
        <div className="flex items-center gap-2.5">
          <button
            id="header-install-app-btn"
            onClick={onOpenInstallModal}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 transition-all hover:border-cyan-400/60 hover:bg-cyan-900/50 hover:text-white"
          >
            <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Install App</span>
          </button>

          <div
            title={hasGeminiKey ? 'Gemini 3.8 / Veo Online' : 'Local Fallback Engine Active'}
            className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 lg:flex"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                hasGeminiKey ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'
              }`}
            />
            <span>{hasGeminiKey ? 'Gemini AI Brain' : 'Engine Ready'}</span>
          </div>

          <button
            id="user-profile-button"
            onClick={onOpenUserModal}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/40 hover:bg-slate-800"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
              {currentUser?.name?.slice(0, 1) || 'U'}
            </div>
            <div className="hidden text-left sm:block">
              <div className="font-medium text-white">{currentUser?.name || 'Creator'}</div>
              <div className="text-[10px] text-slate-400">
                {currentUser?.usage?.totalCreations ?? 
                 (currentUser?.stats ? currentUser.stats.imagesGenerated + currentUser.stats.videosGenerated : 0)} creations
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
