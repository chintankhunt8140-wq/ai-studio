import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Trash2,
  Heart,
  Copy,
  Check,
  Sparkles,
  Film,
  Image as ImageIcon,
  RotateCcw,
  Sliders,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  Layers,
  Clock,
  Cpu,
} from 'lucide-react';
import { CreationAsset } from '../types';

interface AssetModalProps {
  asset: CreationAsset | null;
  onClose: () => void;
  onRegenerate: (asset: CreationAsset) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onRemix: (asset: CreationAsset) => void;
}

export const AssetModal: React.FC<AssetModalProps> = ({
  asset,
  onClose,
  onRegenerate,
  onDelete,
  onToggleFavorite,
  onRemix,
}) => {
  if (!asset) return null;

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'media' | 'compare' | 'specs'>('media');
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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = asset.mediaUrl;
    const ext = asset.mode === 'video' ? 'mp4' : 'png';
    link.download = `ai-studio-${asset.mode}-${asset.id}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-6 backdrop-blur-md">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-950 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-3.5 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl text-white ${
                asset.mode === 'video'
                  ? 'bg-indigo-600'
                  : 'bg-cyan-600'
              }`}
            >
              {asset.mode === 'video' ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  {asset.mode === 'video' ? '10-Second Cinematic Video' : 'Master Synthesis'}
                </h2>
                <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                  {asset.aspectRatio} • {asset.metadata?.resolution || '1080p'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Created {new Date(asset.createdAt).toLocaleString()} • {asset.userName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {asset.referenceImage && (
              <div className="flex rounded-lg border border-white/10 bg-slate-950 p-0.5 text-xs">
                <button
                  onClick={() => setActiveTab('media')}
                  className={`rounded-md px-2.5 py-1 ${
                    activeTab === 'media' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Result
                </button>
                <button
                  onClick={() => setActiveTab('compare')}
                  className={`rounded-md px-2.5 py-1 ${
                    activeTab === 'compare' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Compare Ref
                </button>
              </div>
            )}

            <button
              id="close-asset-modal-btn"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Media, Right Inspector */}
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Main Visual Display */}
          <div className="relative flex flex-1 items-center justify-center bg-black/90 p-4">
            {activeTab === 'compare' && asset.referenceImage ? (
              <div className="grid h-full w-full grid-cols-2 gap-4">
                <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-2">
                  <span className="absolute top-4 left-4 z-10 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
                    Reference Image
                  </span>
                  <img
                    src={asset.referenceImage.dataUrl}
                    alt="Reference"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900 p-2">
                  <span className="absolute top-4 left-4 z-10 rounded-md bg-cyan-950/80 px-2 py-1 text-[11px] font-semibold text-cyan-300 backdrop-blur">
                    Synthesized Result
                  </span>
                  {asset.mode === 'video' ? (
                    <video
                      src={asset.mediaUrl}
                      autoPlay
                      loop
                      playsInline
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <img
                      src={asset.mediaUrl}
                      alt="Result"
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
              </div>
            ) : asset.mode === 'video' ? (
              <div className="relative flex h-full w-full items-center justify-center">
                <video
                  ref={videoRef}
                  src={asset.mediaUrl}
                  poster={asset.thumbnailUrl}
                  autoPlay
                  loop
                  playsInline
                  muted={isMuted}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
                />

                {/* Video HUD */}
                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-2xl border border-white/10 bg-black/70 px-4 py-2.5 backdrop-blur-md">
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
                      Duration: 10.0s • 24 FPS
                    </span>
                  </div>

                  <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                    MP4 Container
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative flex h-full w-full items-center justify-center">
                <img
                  src={asset.mediaUrl}
                  alt={asset.originalPrompt}
                  className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
                />
              </div>
            )}
          </div>

          {/* Right Inspector & Control Panel */}
          <div className="flex w-full flex-col justify-between border-t border-white/10 bg-slate-900/90 p-5 lg:w-96 lg:border-l lg:border-t-0">
            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Actions Button Bar */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="modal-download-btn"
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-400"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>

                <button
                  id="modal-regenerate-btn"
                  onClick={() => {
                    onRegenerate(asset);
                    onClose();
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 py-2.5 text-xs font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Regenerate</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="modal-fav-btn"
                  onClick={() => onToggleFavorite(asset.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium ${
                    asset.isFavorite
                      ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                      : 'border-white/10 bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 ${asset.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{asset.isFavorite ? 'Saved' : 'Favorite'}</span>
                </button>

                <button
                  id="modal-remix-btn"
                  onClick={() => {
                    onRemix(asset);
                    onClose();
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 py-2 text-xs font-medium text-slate-300 hover:text-white"
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Remix</span>
                </button>

                <button
                  id="modal-delete-btn"
                  onClick={() => {
                    onDelete(asset.id);
                    onClose();
                  }}
                  className="rounded-xl border border-white/10 bg-slate-800 p-2 text-slate-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Prompts Section */}
              <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    User Prompt
                  </span>
                  <p className="mt-1 text-slate-200">{asset.originalPrompt}</p>
                </div>

                <div className="border-t border-white/5 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                      Enhanced Prompt
                    </span>
                    <button
                      onClick={copyPrompt}
                      className="flex items-center gap-1 text-[10px] text-cyan-300 hover:underline"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="mt-1 text-slate-300 text-[11px] leading-relaxed">
                    {asset.enhancedPrompt}
                  </p>
                </div>
              </div>

              {/* AI Brain Specs */}
              {asset.aiPlan && (
                <div className="space-y-2 rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-300">
                    <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                    <span>AI Brain Specs</span>
                  </div>

                  <div className="space-y-1 text-slate-300">
                    <div>
                      <span className="text-slate-500">Style: </span>
                      {asset.aiPlan.visualStyle}
                    </div>
                    <div>
                      <span className="text-slate-500">Lighting: </span>
                      {asset.aiPlan.lighting}
                    </div>
                    <div>
                      <span className="text-slate-500">Composition: </span>
                      {asset.aiPlan.composition}
                    </div>
                    {asset.aiPlan.videoPlan && (
                      <div className="text-indigo-300">
                        <span className="text-slate-500">Camera: </span>
                        {asset.aiPlan.videoPlan.cameraMovement}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Technical Metadata */}
              <div className="space-y-1.5 rounded-2xl border border-white/10 bg-slate-950/40 p-3.5 text-[10px] text-slate-400">
                <div className="flex justify-between">
                  <span>Engine Provider</span>
                  <span className="font-mono text-slate-300">{asset.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dimensions</span>
                  <span className="font-mono text-slate-300">{asset.metadata?.resolution || '1080p'}</span>
                </div>
                <div className="flex justify-between">
                  <span>File Size</span>
                  <span className="font-mono text-slate-300">
                    {((asset.fileSizeBytes || 0) / 1024).toFixed(1)} KB
                  </span>
                </div>
                {asset.metadata?.renderTimeMs && (
                  <div className="flex justify-between">
                    <span>Render Time</span>
                    <span className="font-mono text-slate-300">
                      {(asset.metadata.renderTimeMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 border-t border-white/10 pt-3 text-center text-[10px] text-slate-500">
              AI Studio • Secure local storage &amp; cloud ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
