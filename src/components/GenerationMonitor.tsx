import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Film,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Terminal,
  XCircle,
  Cpu,
  Layers,
  Activity,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { GenerationJob, JobStatus } from '../types';

interface GenerationMonitorProps {
  job: GenerationJob;
  onCancel: () => void;
  isCancelling: boolean;
}

const STEPS: { id: JobStatus; label: string; description: string }[] = [
  { id: 'analyzing', label: 'Analyzing', description: 'Semantic intent & reference analysis' },
  { id: 'planning', label: 'Planning', description: 'AI Brain synthesis & motion roadmap' },
  { id: 'generating', label: 'Generating', description: 'Neural diffusion / 10s video rendering' },
  { id: 'finalizing', label: 'Finalizing', description: 'Asset packaging & library cataloging' },
];

export const GenerationMonitor: React.FC<GenerationMonitorProps> = ({
  job,
  onCancel,
  isCancelling,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const start = job.createdAt;
      const seconds = Math.floor((Date.now() - start) / 1000);
      setElapsed(seconds);
    }, 500);
    return () => clearInterval(timer);
  }, [job.createdAt]);

  const getStepIndex = (status: JobStatus) => {
    switch (status) {
      case 'queued':
        return -1;
      case 'analyzing':
        return 0;
      case 'planning':
        return 1;
      case 'generating':
        return 2;
      case 'finalizing':
        return 3;
      case 'completed':
        return 4;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(job.status);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-slate-900/90 p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />

        <div className="relative space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
                {job.mode === 'video' ? (
                  <Film className="h-5 w-5 animate-pulse" />
                ) : (
                  <Sparkles className="h-5 w-5 animate-spin" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-white">
                    {job.mode === 'video' ? 'Synthesizing 10s Cinematic Video' : 'Synthesizing High-Res Image'}
                  </h3>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400">
                    {job.aspectRatio}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Job ID: <span className="font-mono">{job.id}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-300">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span>{elapsed}s elapsed</span>
              </div>

              {job.status !== 'completed' && job.status !== 'failed' && (
                <button
                  id="cancel-generation-btn"
                  onClick={onCancel}
                  disabled={isCancelling}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>{isCancelling ? 'Cancelling...' : 'Cancel'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar & Current Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium text-slate-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
                </span>
                <span>{job.currentStepMessage || 'Synthesizing visual components...'}</span>
              </div>
              <span className="font-mono font-bold text-cyan-400">{job.progress}%</span>
            </div>

            {/* Custom styled progress line */}
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-950">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${Math.max(5, job.progress)}%` }}
              />
            </div>
          </div>

          {/* Stepper (Analyzing -> Planning -> Generating -> Finalizing) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STEPS.map((step, idx) => {
              const isCompleted = currentStepIdx > idx;
              const isActive = currentStepIdx === idx;

              return (
                <div
                  key={step.id}
                  className={`relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all ${
                    isActive
                      ? 'border-cyan-500/60 bg-gradient-to-b from-cyan-950/40 to-slate-950 ring-1 ring-cyan-500/30'
                      : isCompleted
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : 'border-white/5 bg-slate-950/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-500">0{idx + 1}</span>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : isActive ? (
                      <div className="h-4 w-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                    ) : (
                      <span className="h-3 w-3 rounded-full border border-slate-700" />
                    )}
                  </div>

                  <div className="mt-2 space-y-0.5">
                    <div
                      className={`text-xs font-bold ${
                        isActive
                          ? 'text-cyan-300'
                          : isCompleted
                          ? 'text-emerald-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </div>
                    <div className="text-[10px] text-slate-400">{step.description}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Brain Live Analysis Breakdown (Real-time inspect) */}
          {job.aiPlan && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Cpu className="h-4 w-4" />
                <span>AI Brain Synthesized Architecture</span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400">Intent &amp; Framing</span>
                  <p className="mt-0.5 text-slate-200">{job.aiPlan.intent}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Visual Style &amp; Lighting</span>
                  <p className="mt-0.5 text-slate-200">
                    {job.aiPlan.visualStyle} • {job.aiPlan.lighting}
                  </p>
                </div>

                {job.aiPlan.videoPlan && (
                  <div className="sm:col-span-2 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-2.5">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-300">
                      <Film className="h-3.5 w-3.5" />
                      <span>10s Motion Choreography:</span>
                      <span className="text-slate-300 font-normal">
                        {job.aiPlan.videoPlan.cameraMovement} ({job.aiPlan.videoPlan.speed} speed)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live Engine Logs Stream */}
          <div className="rounded-2xl border border-white/10 bg-black/80 p-4 font-mono text-[11px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                <span>Live Orchestrator Logs</span>
              </div>
              <span className="text-[10px] text-emerald-400">● Streaming</span>
            </div>

            <div className="mt-2.5 max-h-36 space-y-1.5 overflow-y-auto pr-1">
              {job.logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 leading-relaxed">
                  <span className="shrink-0 text-slate-600">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`rounded px-1 text-[10px] uppercase ${
                      log.step === 'completed'
                        ? 'bg-emerald-950 text-emerald-300'
                        : log.step === 'generating'
                        ? 'bg-blue-950 text-cyan-300'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {log.step}
                  </span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
