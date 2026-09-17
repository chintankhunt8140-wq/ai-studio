import React, { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sliders,
  Shield,
  Clock,
  Film,
  Image as ImageIcon,
  Zap,
} from 'lucide-react';
import { SystemStats, UserProfile } from '../types';
import { fetchAdminSettings, fetchSystemStats, fetchUsers, updateAdminSettings } from '../lib/api';
import { AdminStatsCharts } from './AdminStatsCharts';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [s, cfg, uList] = await Promise.all([
        fetchSystemStats(),
        fetchAdminSettings(),
        fetchUsers().catch(() => []),
      ]);
      setStats(s);
      setSettings(cfg);
      setUsers(uList || []);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSettings = async (newSettings: any) => {
    try {
      setSaving(true);
      const updated = await updateAdminSettings(newSettings);
      setSettings(updated);
      setMessage('Engine configuration updated successfully');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Failed to update engine configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Engine Diagnostics &amp; Controls</h2>
          <p className="text-xs text-slate-400">
            Real-time server orchestration, queue status, and provider configurations.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 self-start rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {message && (
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/40 p-3 text-xs text-cyan-300">
          {message}
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Gemini API Gateway</span>
            <Shield className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                stats?.hasGeminiKey ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-lg font-bold text-white">
              {stats?.hasGeminiKey ? 'Active Key' : 'Local Fallback'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {stats?.hasGeminiKey ? 'Direct Google GenAI SDK' : 'Built-in Canvas & FFmpeg'}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Job Queue</span>
            <Activity className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-3 text-lg font-bold text-white">
            {stats?.queue?.running ?? stats?.activeJobsCount ?? 0} active / {stats?.queue?.queued ?? 0} queued
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {stats?.queue?.completed ?? stats?.completedJobsCount ?? 0} jobs processed successfully
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Creations</span>
            <ImageIcon className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-lg font-bold text-white">
            {stats?.creations?.total ?? stats?.totalCreations ?? 0} items
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {stats?.creations?.images ?? stats?.totalImages ?? 0} images • {stats?.creations?.videos ?? stats?.totalVideos ?? 0} 10s videos
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Storage Footprint</span>
            <HardDrive className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-3 text-lg font-bold text-white">
            {stats?.storage?.sizeFormatted ?? (stats?.storageUsedBytes ? `${(stats.storageUsedBytes / (1024 * 1024)).toFixed(1)} MB` : '0 MB')}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {stats?.storage?.fileCount ?? stats?.totalCreations ?? 0} media artifacts cataloged
          </p>
        </div>
      </div>

      {/* Visual Recharts Statistics View */}
      {stats && <AdminStatsCharts stats={stats} users={users} />}

      {/* Model & Engine Configuration */}
      {settings && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-cyan-400" />
            <h3 className="font-display text-base font-bold text-white">
              Generation Engine Routing
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Preferred Image Model */}
            <div className="space-y-2 rounded-2xl border border-white/5 bg-slate-950/60 p-4">
              <label className="text-xs font-bold text-slate-200">
                Primary Image Model Route
              </label>
              <select
                value={settings.preferredImageModel || settings.defaultImageModel || 'gemini-3.1-flash-lite-image'}
                onChange={(e) =>
                  handleSaveSettings({
                    ...settings,
                    preferredImageModel: e.target.value,
                    defaultImageModel: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="gemini-3.1-flash-lite-image">
                  Gemini 3.1 Flash Lite Image (Fast, high-quality)
                </option>
                <option value="imagen-3.0-generate-002">
                  Imagen 3 (Photorealistic master)
                </option>
              </select>
              <p className="text-[11px] text-slate-400">
                Automatically falls back to Creative Canvas Engine if quota or network requires.
              </p>
            </div>

            {/* Preferred Video Model */}
            <div className="space-y-2 rounded-2xl border border-white/5 bg-slate-950/60 p-4">
              <label className="text-xs font-bold text-slate-200">
                Primary Video Model Route (10s Master)
              </label>
              <select
                value={settings.preferredVideoModel || settings.defaultVideoModel || 'veo-3.1-lite-generate-preview'}
                onChange={(e) =>
                  handleSaveSettings({
                    ...settings,
                    preferredVideoModel: e.target.value,
                    defaultVideoModel: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="veo-3.1-lite-generate-preview">
                  Veo 3.1 (State of the art 10s video)
                </option>
                <option value="studio-cinematic-engine-10s">
                  Cinematic 10s Renderer (Ultra-fast 24fps local MP4 engine)
                </option>
              </select>
              <p className="text-[11px] text-slate-400">
                Renders full 10-second MP4 with camera motion, panning, and particle dynamics.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 p-4 text-xs">
            <div>
              <div className="font-semibold text-white">Enable High-Speed Local Fallbacks</div>
              <div className="text-slate-400">
                Guarantees generation never fails even during rate-limits or offline work.
              </div>
            </div>
            <button
              onClick={() => {
                const newVal = !(settings.enableFallbacks ?? settings.enableFallbackRenderer ?? true);
                handleSaveSettings({
                  ...settings,
                  enableFallbacks: newVal,
                  enableFallbackRenderer: newVal,
                });
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                (settings.enableFallbacks ?? settings.enableFallbackRenderer ?? true) ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  (settings.enableFallbacks ?? settings.enableFallbackRenderer ?? true) ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Server Environment Info */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Clock className="h-4 w-4 text-cyan-400" />
          <span>Server Uptime &amp; Environment</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
          <div>
            <span className="text-slate-500">Uptime</span>
            <div className="font-mono text-slate-200">
              {stats ? Math.floor(stats.uptimeSeconds / 60) : 0} minutes
            </div>
          </div>
          <div>
            <span className="text-slate-500">Node Runtime</span>
            <div className="font-mono text-slate-200">v20+ (ESM Bundled)</div>
          </div>
          <div>
            <span className="text-slate-500">AI Framework</span>
            <div className="font-mono text-slate-200">@google/genai</div>
          </div>
          <div>
            <span className="text-slate-500">Video Engine</span>
            <div className="font-mono text-slate-200">FFmpeg 4.4 H.264</div>
          </div>
        </div>
      </div>
    </div>
  );
};
