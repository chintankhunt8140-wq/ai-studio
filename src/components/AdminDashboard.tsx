import React, { useEffect, useState } from 'react';
import {
  Activity,
  HardDrive,
  RefreshCw,
  Sliders,
  Shield,
  Clock,
  Film,
  Image as ImageIcon,
  Zap,
  Building2,
  Users,
} from 'lucide-react';
import { SystemStats, UserProfile } from '../types';
import { fetchAdminSettings, fetchSystemStats, fetchUsers, updateAdminSettings } from '../lib/api';
import { AdminStatsCharts } from './AdminStatsCharts';

interface AdminDashboardProps {
  currentUser?: UserProfile | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(currentUser?.id || 'all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async (workspaceId?: string) => {
    try {
      setLoading(true);
      const targetWorkspace = workspaceId !== undefined ? workspaceId : selectedWorkspaceId;
      const queryId = targetWorkspace === 'all' ? undefined : targetWorkspace;

      const [s, cfg, uList] = await Promise.all([
        fetchSystemStats(queryId),
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
    loadData(selectedWorkspaceId);
    const interval = setInterval(() => loadData(selectedWorkspaceId), 5000);
    return () => clearInterval(interval);
  }, [selectedWorkspaceId]);

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

  const selectedUserObj = users.find((u) => u.id === selectedWorkspaceId);
  const workspaceDisplayName =
    selectedWorkspaceId === 'all'
      ? 'All Workspaces (Global Studio)'
      : selectedUserObj
      ? `${selectedUserObj.name}'s Workspace`
      : 'Active Workspace';

  if (loading && !stats) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header with Workspace Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold text-white">
              Engine Diagnostics &amp; Analytics
            </h2>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400">
              Admin
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time server orchestration, queue performance, and generation trend analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Workspace Filter Dropdown */}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-3 py-1.5 shadow-sm">
            <Building2 className="h-4 w-4 text-cyan-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-500">Workspace Scope</span>
              <select
                id="admin-workspace-filter"
                value={selectedWorkspaceId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedWorkspaceId(newId);
                  loadData(newId);
                }}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">
                  🌐 All Workspaces (Global View)
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                    👤 {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            id="refresh-admin-metrics-btn"
            onClick={() => loadData(selectedWorkspaceId)}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
            <span>Refresh</span>
          </button>
        </div>
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
            <span className="text-xs font-semibold">Gemini AI Gateway</span>
            <Shield className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                stats?.hasGeminiKey ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span className="text-lg font-bold text-white">
              {stats?.hasGeminiKey ? 'Online & Keyed' : 'Key Unset'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {stats?.hasGeminiKey
              ? '@google/genai SDK Active'
              : 'Add GEMINI_API_KEY to .env'}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Job Queue</span>
            <Activity className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-3 text-lg font-bold text-white">
            {stats?.queue?.running ?? stats?.activeJobsCount ?? 0} running / {stats?.queue?.queued ?? 0} queued
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {stats?.queue?.completed ?? stats?.completedJobsCount ?? 0} completed • {stats?.queue?.failed ?? stats?.failedJobsCount ?? 0} failed
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Creations Catalog</span>
            <ImageIcon className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-lg font-bold text-white">
            {stats?.creations?.total ?? stats?.totalCreations ?? 0} items
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {stats?.creations?.images ?? stats?.totalImages ?? 0} images • {stats?.creations?.videos ?? stats?.totalVideos ?? 0} videos
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Storage Footprint</span>
            <HardDrive className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-3 text-lg font-bold text-white">
            {stats?.storage?.sizeFormatted ??
              (stats?.storageUsedBytes ? `${(stats.storageUsedBytes / (1024 * 1024)).toFixed(1)} MB` : '0 MB')}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {stats?.storage?.fileCount ?? stats?.totalCreations ?? 0} media files persisted
          </p>
        </div>
      </div>

      {/* Visual Recharts Statistics View (Workspace Generation Trends) */}
      {stats && (
        <AdminStatsCharts
          stats={stats}
          users={users}
          workspaceName={workspaceDisplayName}
        />
      )}

      {/* Model & Engine Configuration */}
      {settings && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-cyan-400" />
            <h3 className="font-display text-base font-bold text-white">
              AI Generation Engine Routing
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
                  Gemini 3.1 Flash Lite Image (Fast, high-quality multimodal)
                </option>
                <option value="gemini-3.1-flash-image">
                  Gemini 3.1 Flash Image (Ultra-detailed multi-modal)
                </option>
              </select>
              <p className="text-[11px] text-slate-400">
                Direct neural image generation using Google GenAI SDK.
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
                  Veo 3.1 Lite (State of the art 10s video)
                </option>
                <option value="veo-3.1-generate-preview">
                  Veo 3.1 Pro (High-fidelity cinematic 10s video)
                </option>
              </select>
              <p className="text-[11px] text-slate-400">
                Direct 10-second cinematic video synthesis using Google Veo models.
              </p>
            </div>
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
            <span className="text-slate-500">Active Workspace</span>
            <div className="font-mono text-cyan-300 truncate">
              {workspaceDisplayName}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
