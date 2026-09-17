import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Film,
  CheckCircle2,
  Clock,
  Terminal,
  XCircle,
  Cpu,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react';
import { GenerationJob, JobStatus } from '../types';

interface GenerationMonitorProps {
  job: GenerationJob;
  onCancel: () => void;
  isCancelling: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const STEPS: { id: JobStatus; label: string; description: string }[] = [
  { id: 'analyzing', label: 'Analyzing', description: 'Semantic intent & reference analysis' },
  { id: 'planning', label: 'Planning', description: 'AI Brain synthesis & motion roadmap' },
  { id: 'generating', label: 'Generating', description: 'Neural diffusion / Veo 3.1 video synthesis' },
  { id: 'finalizing', label: 'Finalizing', description: 'Asset packaging & library cataloging' },
];

export const GenerationMonitor: React.FC<GenerationMonitorProps> = ({
  job,
  onCancel,
  isCancelling,
  onRetry,
  onDismiss,
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
      case 'created':
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

  const isFailed = job.status === 'failed' || job.status === 'cancelled';
  const currentStepIdx = getStepIndex(job.status);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div
        className={`relative overflow-hidden rounded-3xl border p-6 shadow-2xl sm:p-8 transition-colors ${
          isFailed
            ? 'border-rose-500/40 bg-slate-900/90 shadow-rose-950/20'
            : 'border-cyan-500/30 bg-slate-900/90 shadow-cyan-950/20'
        }`}
      >
        {/* Glow Effects */}
        {!isFailed ? (
          <>
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
          </>
        ) : (
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
        )}

        <div className="relative space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md ${
                  isFailed
                    ? 'bg-rose-600 shadow-rose-600/30'
                    : 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-cyan-500/20'
                }`}
              >
                {isFailed ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : job.mode === 'video' ? (
                  <Film className="h-5 w-5 animate-pulse" />
                ) : (
                  <Sparkles className="h-5 w-5 animate-spin" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-white">
                    {isFailed
                      ? job.status === 'cancelled'
                        ? 'Generation Cancelled'
                        : 'Generation Error'
                      : job.mode === 'video'
                      ? 'Synthesizing 10s Cinematic Video'
                      : 'Synthesizing High-Res Image'}
                  </h3>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      isFailed
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                        : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                    }`}
                  >
                    {job.aspectRatio}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Job ID: <span className="font-mono">{job.id}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-300">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span>{elapsed}s elapsed</span>
              </div>

              {!isFailed && job.status !== 'completed' && (
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

              {isFailed && (
                <div className="flex items-center gap-2">
                  {onRetry && (
                    <button
                      id="retry-failed-job-btn"
                      onClick={onRetry}
                      className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/30"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Retry</span>
                    </button>
                  )}
                  {onDismiss && (
                    <button
                      onClick={onDismiss}
                      className="rounded-xl border border-white/10 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white"
                      title="Dismiss notification"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Failure Alert Banner */}
          {isFailed && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-200">
              <div className="font-semibold text-rose-300 mb-1">
                {job.status === 'cancelled'
                  ? 'Job cancelled by user request'
                  : 'AI Provider reported an error'}
              </div>
              <p className="text-slate-300 font-mono text-[11px] break-words">
                {job.error || 'Generation was interrupted or encountered a failure.'}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[11px] text-slate-400">
                  Tip: Verify your prompt or ensure a valid Gemini API key is configured.
                </span>
              </div>
            </div>
          )}

          {/* Progress Bar & Current Status */}
          {!isFailed && (
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

              {/* Progress bar line */}
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-950">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(5, job.progress)}%` }}
                />
              </div>
            </div>
          )}

          {/* Stepper (Analyzing -> Planning -> Generating -> Finalizing) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STEPS.map((step, idx) => {
              const isCompleted = !isFailed && currentStepIdx > idx;
              const isActive = !isFailed && currentStepIdx === idx;

              return (
                <div
                  key={step.id}
                  className={`relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all ${
                    isActive
                      ? 'border-cyan-500/60 bg-gradient-to-b from-cyan-950/40 to-slate-950 ring-1 ring-cyan-500/30'
                      : isCompleted
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : isFailed
                      ? 'border-white/5 bg-slate-950/30 opacity-40'
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

          {/* AI Brain Live Analysis Breakdown */}
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
              <span
                className={`text-[10px] ${
                  isFailed ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                ● {isFailed ? 'Stopped' : 'Streaming'}
              </span>
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
                        : log.step === 'failed' || log.step === 'cancelled'
                        ? 'bg-rose-950 text-rose-300'
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
