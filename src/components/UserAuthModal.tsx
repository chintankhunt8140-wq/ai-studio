import React from 'react';
import {
  X,
  User,
  ShieldCheck,
  Zap,
  Film,
  Image as ImageIcon,
  Sparkles,
  Clock,
  Check,
} from 'lucide-react';
import { UserProfile } from '../types';

interface UserAuthModalProps {
  currentUser: UserProfile | null;
  users: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  onClose: () => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  currentUser,
  users,
  onSelectUser,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">Creator Account</h3>
              <p className="text-xs text-slate-400">Profile switching &amp; synthesis metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current User Card */}
          {currentUser && (
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 to-blue-950/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-base font-bold text-white shadow-md">
                    {currentUser.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{currentUser.name}</span>
                      <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                        {currentUser.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">{currentUser.email}</div>
                  </div>
                </div>
              </div>

              {/* Usage Metrics */}
              <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl border border-white/5 bg-slate-950/60 p-3 text-center">
                <div>
                  <div className="font-display text-base font-bold text-white">
                    {currentUser.usage?.imagesGenerated ?? currentUser.stats?.imagesGenerated ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-400">Images</div>
                </div>
                <div>
                  <div className="font-display text-base font-bold text-indigo-400">
                    {currentUser.usage?.videosGenerated ?? currentUser.stats?.videosGenerated ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-400">10s Videos</div>
                </div>
                <div>
                  <div className="font-display text-base font-bold text-cyan-400">
                    {currentUser.usage?.promptsImproved ?? currentUser.stats?.promptEnhancements ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-400">Brain Plans</div>
                </div>
                <div>
                  <div className="font-display text-base font-bold text-emerald-400">
                    {currentUser.usage?.videoSecondsRendered ?? currentUser.stats?.totalRenderSeconds ?? 0}s
                  </div>
                  <div className="text-[10px] text-slate-400">Rendered</div>
                </div>
              </div>
            </div>
          )}

          {/* Switch Persona */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Switch Creator Workspace
            </label>
            <div className="space-y-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    onSelectUser(u);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-colors ${
                    currentUser?.id === u.id
                      ? 'border-cyan-500/50 bg-cyan-950/20 text-white'
                      : 'border-white/5 bg-slate-950/40 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 font-bold text-white">
                      {u.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{u.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {u.role} • {u.usage?.totalCreations ?? ((u.stats?.imagesGenerated || 0) + (u.stats?.videosGenerated || 0))} creations
                      </div>
                    </div>
                  </div>

                  {currentUser?.id === u.id && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-slate-950">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
