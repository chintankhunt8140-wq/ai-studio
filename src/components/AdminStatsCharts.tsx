import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { SystemStats, UserProfile } from '../types';
import { BarChart3, Users, Award, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';

interface AdminStatsChartsProps {
  stats: SystemStats;
  users: UserProfile[];
  workspaceName?: string;
}

export const AdminStatsCharts: React.FC<AdminStatsChartsProps> = ({ stats, users, workspaceName }) => {
  // 1. Creations Breakdown Data
  const totalCreations = stats?.creations?.total ?? stats?.totalCreations ?? 0;
  const imageCount = stats?.creations?.images ?? stats?.totalImages ?? 0;
  const videoCount = stats?.creations?.videos ?? stats?.totalVideos ?? 0;

  const creationsData = [
    {
      name: 'Images',
      count: imageCount,
      color: '#06b6d4', // cyan-500
    },
    {
      name: '10s Videos',
      count: videoCount,
      color: '#6366f1', // indigo-500
    },
  ];

  // 2. Top Users Data
  const sortedUsers = [...users]
    .map((u) => {
      const creations =
        u.usage?.totalCreations ??
        (u.stats ? u.stats.imagesGenerated + u.stats.videosGenerated : 0);
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        creations,
        images: u.usage?.imagesGenerated ?? u.stats?.imagesGenerated ?? 0,
        videos: u.usage?.videosGenerated ?? u.stats?.videosGenerated ?? 0,
      };
    })
    .sort((a, b) => b.creations - a.creations)
    .slice(0, 5);

  const topUsersChartData = sortedUsers.map((u) => ({
    name: u.name.length > 12 ? `${u.name.slice(0, 11)}…` : u.name,
    fullName: u.name,
    creations: u.creations,
    role: u.role,
  }));

  // 3. Generation Success Rate Data
  const completedJobs = stats?.queue?.completed ?? stats?.completedJobsCount ?? 0;
  const failedJobs = stats?.queue?.failed ?? stats?.failedJobsCount ?? 0;
  const activeJobs = stats?.queue?.running ?? stats?.activeJobsCount ?? 0;

  const totalFinishedJobs = completedJobs + failedJobs;
  const successRate =
    totalFinishedJobs > 0
      ? Math.round((completedJobs / totalFinishedJobs) * 100)
      : completedJobs > 0
      ? 100
      : 100;

  const successRateData = [
    { name: 'Completed', value: Math.max(completedJobs, totalFinishedJobs === 0 ? 1 : 0), color: '#10b981' }, // emerald-500
    { name: 'Failed', value: failedJobs, color: '#f43f5e' }, // rose-500
    { name: 'Active/Queued', value: activeJobs, color: '#06b6d4' }, // cyan-500
  ].filter((item) => item.value > 0);

  // 4. Daily Trends Data
  const dailyTrendsData = stats?.dailyTrends || [];

  return (
    <div id="admin-statistics-view" className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-cyan-400" />
        <h3 className="font-display text-base font-bold text-white">
          Studio Analytics &amp; Performance
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Chart 1: Creations Distribution */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Creations</span>
              <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-bold text-cyan-400">
                {totalCreations} Total
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-extrabold text-white">
                {totalCreations}
              </span>
              <span className="text-xs text-slate-400">
                ({imageCount} images, {videoCount} videos)
              </span>
            </div>
          </div>

          <div className="mt-4 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={creationsData}
                margin={{ top: 15, right: 10, left: -15, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-white/10 bg-slate-950 p-2.5 shadow-xl text-xs">
                          <div className="font-semibold text-white">{data.name}</div>
                          <div className="mt-1 text-slate-300">
                            Count: <span className="font-bold text-cyan-400">{data.count}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {creationsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex items-center justify-around border-t border-white/5 pt-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              <span>Images: <strong className="text-white">{imageCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              <span>10s Videos: <strong className="text-white">{videoCount}</strong></span>
            </div>
          </div>
        </div>

        {/* Chart 2: Top Users Leaderboard */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Top Creators</span>
              <div className="flex items-center gap-1 text-[11px] text-indigo-400">
                <Users className="h-3 w-3" />
                <span>{users.length} registered</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Ranked by total assets rendered in studio
            </p>
          </div>

          <div className="mt-4 h-48 w-full">
            {topUsersChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topUsersChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    width={75}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-white/10 bg-slate-950 p-2.5 shadow-xl text-xs">
                            <div className="font-semibold text-white">{data.fullName}</div>
                            <div className="text-[10px] text-slate-400">{data.role}</div>
                            <div className="mt-1 text-slate-300">
                              Total Creations: <span className="font-bold text-indigo-400">{data.creations}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="creations" fill="#818cf8" radius={[0, 6, 6, 0]}>
                    {topUsersChartData.map((_, index) => (
                      <Cell
                        key={`user-bar-${index}`}
                        fill={index === 0 ? '#6366f1' : index === 1 ? '#818cf8' : '#a5b4fc'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                No user activity logged yet
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-slate-400">
            <span>Top performer:</span>
            <span className="font-medium text-white">
              {sortedUsers[0] ? `${sortedUsers[0].name} (${sortedUsers[0].creations} creations)` : '—'}
            </span>
          </div>
        </div>

        {/* Chart 3: Generation Success Rate */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Generation Success Rate</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  successRate >= 90
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : successRate >= 70
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {successRate}% Success
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Pipeline job completions vs execution errors
            </p>
          </div>

          <div className="relative mt-2 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={successRateData}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="#0f172a"
                  strokeWidth={2}
                >
                  {successRateData.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-white/10 bg-slate-950 p-2.5 shadow-xl text-xs">
                          <div className="font-semibold text-white">{data.name}</div>
                          <div className="mt-1 text-slate-300">
                            Jobs: <strong style={{ color: data.color }}>{data.value}</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Success Rate Label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-xl font-black text-white">
                {successRate}%
              </span>
              <span className="text-[10px] text-slate-400">Reliability</span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-around border-t border-white/5 pt-3 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Done: <strong className="text-white">{completedJobs}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span>Failed: <strong className="text-white">{failedJobs}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span>Active: <strong className="text-white">{activeJobs}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart 4: Daily Trends (Recharts) */}
      <div id="generation-trends-chart" className="mt-5 rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">
              Generation Trends (Daily Volume)
              {workspaceName && (
                <span className="ml-2 text-xs font-normal text-cyan-300">
                  • {workspaceName}
                </span>
              )}
            </span>
          </div>
          {dailyTrendsData.length > 0 && (
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-bold text-indigo-400">
              {dailyTrendsData.reduce((acc, d) => acc + d.total, 0)} Total Recent Volume
            </span>
          )}
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dailyTrendsData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorImages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl border border-white/10 bg-slate-950 p-3 shadow-xl">
                        <div className="mb-2 border-b border-white/10 pb-1 text-xs font-semibold text-white">
                          Date: {label}
                        </div>
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center justify-between gap-4 text-xs">
                            <span style={{ color: entry.color }} className="font-medium">
                              {entry.name}
                            </span>
                            <span className="font-bold text-white">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Creations"
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
              <Area
                type="monotone"
                dataKey="images"
                name="Images"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorImages)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
