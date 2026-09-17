import React, { useState, useRef } from 'react';
import {
  Download,
  RotateCcw,
  Trash2,
  Maximize2,
  Heart,
  Copy,
  Check,
  Sparkles,
  Film,
  Image as ImageIcon,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Share2,
  Eye,
  Sliders,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { CreationAsset } from '../types';

interface ResultShowcaseProps {
  asset: CreationAsset;
  onPreview: (asset: CreationAsset) => void;
  onRegenerate: (asset: CreationAsset) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onRemix: (asset: CreationAsset) => void;
}

export const ResultShowcase: React.FC<ResultShowcaseProps> = ({
  asset,
  onPreview,
  onRegenerate,
  onDelete,
  onToggleFavorite,
  onRemix,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showBrainDetails, setShowBrainDetails] = useState(false);
  const [compareMode, setCompareMode] = useState<'result' | 'reference' | 'split'>('result');
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(asset.enhancedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(asset.mediaUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const ext = asset.mode === 'video' ? 'mp4' : 'png';
      link.download = `ai-studio-${asset.mode}-${asset.id}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      const link = document.createElement('a');
      link.href = asset.mediaUrl;
      const ext = asset.mode === 'video' ? 'mp4' : 'png';
      link.download = `ai-studio-${asset.mode}-${asset.id}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Top Banner Alert / Success */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">
            {asset.mode === 'video'
              ? '10-Second Cinematic Video Synthesized Successfully'
              : 'Neural Master Image Synthesized Successfully'}
          </span>
          <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
            {asset.metadata?.resolution || '1080p'} • {asset.aspectRatio}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="remix-prompt-btn"
            onClick={() => onRemix(asset)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500 hover:text-white"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Remix in Studio</span>
          </button>
        </div>
      </div>

      {/* Main Showcase Canvas Container */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/80">
        {/* Media Frame */}
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-black">
          {asset.mode === 'video' ? (
            <div className="group relative h-full w-full">
              <video
                ref={videoRef}
                src={asset.mediaUrl}
                poster={asset.thumbnailUrl}
                loop
                playsInline
                muted={isMuted}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="h-full w-full object-contain cursor-pointer"
                onClick={togglePlay}
              />

              {/* Video Overlay Badge */}
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-mono text-white backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span>10.0s • 24FPS</span>
              </div>

              {/* Play / Pause Center Overlay Button */}
              <button
                id="toggle-video-play-btn"
                onClick={togglePlay}
                className={`absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-black/80 ${
                  isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'
                }`}
              >
                {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
              </button>

              {/* Controls bar at bottom */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="text-white hover:text-cyan-400"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-white hover:text-cyan-400"
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                  <span className="font-mono text-xs text-slate-300">
                    {asset.durationSeconds || 10}s
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="fullscreen-video-btn"
                    onClick={() => onPreview(asset)}
                    className="rounded-lg p-1.5 text-white hover:bg-white/20"
                    title="Fullscreen Lightbox"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="group relative h-full w-full">
              <img
                src={asset.mediaUrl}
                alt={asset.originalPrompt}
                className="h-full w-full object-contain cursor-zoom-in"
                onClick={() => onPreview(asset)}
              />
              <button
                id="zoom-image-btn"
                onClick={() => onPreview(asset)}
                className="absolute right-4 top-4 rounded-xl bg-black/60 p-2 text-white backdrop-blur-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
                title="Zoom image"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Reference Image Inset if provided */}
          {asset.referenceImage && (
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-xl border border-white/20 bg-slate-900/90 p-1.5 shadow-xl backdrop-blur-md">
              <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-black">
                <img
                  src={asset.referenceImage.dataUrl}
                  alt="Reference"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="pr-2 text-left">
                <div className="text-[10px] font-semibold text-white">Reference Image</div>
                <div className="text-[9px] text-slate-400">Preserved in synthesis</div>
              </div>
            </div>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-slate-900/90 p-4">
          <div className="flex items-center gap-2">
            <button
              id="action-favorite-btn"
              onClick={() => onToggleFavorite(asset.id)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                asset.isFavorite
                  ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                  : 'border-white/10 bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${asset.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{asset.isFavorite ? 'Favorited' : 'Favorite'}</span>
            </button>

            <button
              id="action-preview-btn"
              onClick={() => onPreview(asset)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <Eye className="h-3.5 w-3.5 text-cyan-400" />
              <span>Fullscreen</span>
            </button>

            <button
              id="action-copy-prompt-btn"
              onClick={copyPrompt}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? 'Copied!' : 'Copy Prompt'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="action-regenerate-btn"
              onClick={() => onRegenerate(asset)}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Regenerate</span>
            </button>

            <button
              id="action-download-btn"
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:brightness-110 active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download {asset.mode === 'video' ? 'MP4' : 'PNG'}</span>
            </button>

            <button
              id="action-delete-btn"
              onClick={() => onDelete(asset.id)}
              className="rounded-xl border border-white/10 p-2 text-slate-400 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
              title="Delete Asset"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Prompts & AI Brain Architecture Inspector */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
        {/* Original Prompt */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Original Input Prompt</span>
            <span className="font-mono text-[11px]">{asset.originalPrompt.length} chars</span>
          </div>
          <p className="rounded-xl border border-white/5 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-200">
            "{asset.originalPrompt}"
          </p>
        </div>

        {/* AI Brain Enhanced Prompt */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-cyan-400">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Brain Enhanced Prompt</span>
            </div>
            <button
              onClick={() => setShowBrainDetails(!showBrainDetails)}
              className="flex items-center gap-1 text-[11px] text-cyan-300 hover:underline"
            >
              <span>{showBrainDetails ? 'Hide Brain Specs' : 'View Brain Specs'}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showBrainDetails ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <p className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs leading-relaxed text-slate-100">
            {asset.enhancedPrompt}
          </p>
        </div>

        {/* Brain Specs Accordion */}
        {showBrainDetails && asset.aiPlan && (
          <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-slate-950/80 p-4 text-xs sm:grid-cols-2">
            <div>
              <span className="font-semibold text-slate-400">Composition</span>
              <p className="text-slate-200">{asset.aiPlan.composition}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-400">Lighting</span>
              <p className="text-slate-200">{asset.aiPlan.lighting}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-400">Visual Style</span>
              <p className="text-slate-200">{asset.aiPlan.visualStyle}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-400">Negative Constraints</span>
              <p className="text-slate-400">{asset.aiPlan.negativeConstraints}</p>
            </div>

            {asset.aiPlan.videoPlan && (
              <div className="sm:col-span-2 space-y-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/30 p-3">
                <span className="font-bold text-indigo-300 uppercase tracking-wider text-[11px]">
                  10s Motion Choreography
                </span>
                <div className="text-slate-200">
                  {asset.aiPlan.videoPlan.cameraMovement} ({asset.aiPlan.videoPlan.speed} speed)
                </div>
                <div className="space-y-1 pt-1">
                  {asset.aiPlan.videoPlan.timelineKeyframes?.map((kf, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-slate-300">
                      <span className="h-1 w-1 rounded-full bg-indigo-400" />
                      <span>{kf}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
