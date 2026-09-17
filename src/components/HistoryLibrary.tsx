import React, { useState } from 'react';
import {
  Sparkles,
  Film,
  Image as ImageIcon,
  Heart,
  Search,
  Download,
  Trash2,
  Maximize2,
  RotateCcw,
  Play,
  Calendar,
  Filter,
} from 'lucide-react';
import { CreationAsset, GenerationMode } from '../types';

interface HistoryLibraryProps {
  creations: CreationAsset[];
  onSelectAsset: (asset: CreationAsset) => void;
  onRegenerate: (asset: CreationAsset) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onRemix: (asset: CreationAsset) => void;
  onNavigateStudio: () => void;
}

export const HistoryLibrary: React.FC<HistoryLibraryProps> = ({
  creations,
  onSelectAsset,
  onRegenerate,
  onDelete,
  onToggleFavorite,
  onRemix,
  onNavigateStudio,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'image' | 'video' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = creations.filter((item) => {
    if (filterMode === 'image' && item.mode !== 'image') return false;
    if (filterMode === 'video' && item.mode !== 'video') return false;
    if (filterMode === 'favorites' && !item.isFavorite) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inOriginal = item.originalPrompt.toLowerCase().includes(q);
      const inEnhanced = item.enhancedPrompt.toLowerCase().includes(q);
      const inIntent = item.aiPlan?.intent?.toLowerCase().includes(q) || false;
      return inOriginal || inEnhanced || inIntent;
    }
    return true;
  });

  const counts = {
    all: creations.length,
    image: creations.filter((c) => c.mode === 'image').length,
    video: creations.filter((c) => c.mode === 'video').length,
    favorites: creations.filter((c) => c.isFavorite).length,
  };

  const handleDownload = (e: React.MouseEvent, asset: CreationAsset) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = asset.mediaUrl;
    const ext = asset.mode === 'video' ? 'mp4' : 'png';
    link.download = `ai-studio-${asset.mode}-${asset.id}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Controls Bar: Filters & Search */}
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            id="filter-all-btn"
            onClick={() => setFilterMode('all')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              filterMode === 'all'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>All Creations</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
              {counts.all}
            </span>
          </button>

          <button
            id="filter-images-btn"
            onClick={() => setFilterMode('image')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              filterMode === 'image'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Images</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
              {counts.image}
            </span>
          </button>

          <button
            id="filter-videos-btn"
            onClick={() => setFilterMode('video')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              filterMode === 'video'
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            <span>10s Videos</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
              {counts.video}
            </span>
          </button>

          <button
            id="filter-favorites-btn"
            onClick={() => setFilterMode('favorites')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              filterMode === 'favorites'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            <span>Favorites</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
              {counts.favorites}
            </span>
          </button>
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="library-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts or style..."
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid or Empty State */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-900/40 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
            <Sparkles className="h-8 w-8 text-cyan-400" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-white">
            {searchQuery ? 'No matching creations found' : 'Your Library is Empty'}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-400">
            {searchQuery
              ? 'Try modifying your search keywords or clear filters.'
              : 'Enter a vision in the Studio to synthesize your first neural image or 10-second video.'}
          </p>
          <button
            id="empty-state-studio-btn"
            onClick={onNavigateStudio}
            className="mt-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110"
          >
            Open Creation Studio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((asset) => (
            <div
              key={asset.id}
              onClick={() => onSelectAsset(asset)}
              className="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-950/30"
            >
              {/* Media Thumbnail */}
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                {asset.mode === 'video' ? (
                  <div className="relative h-full w-full">
                    <video
                      src={asset.mediaUrl}
                      poster={asset.thumbnailUrl}
                      muted
                      loop
                      playsInline
                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                      onMouseLeave={(e) => {
                        const v = e.target as HTMLVideoElement;
                        v.pause();
                        v.currentTime = 0;
                      }}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-white backdrop-blur">
                      <Play className="h-2.5 w-2.5 fill-white" />
                      <span>10s</span>
                    </div>
                  </div>
                ) : (
                  <img
                    src={asset.mediaUrl}
                    alt={asset.originalPrompt}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                {/* Badge Top Left */}
                <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                  <span
                    className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md ${
                      asset.mode === 'video' ? 'bg-indigo-600/90' : 'bg-cyan-600/90'
                    }`}
                  >
                    {asset.mode === 'video' ? (
                      <Film className="h-2.5 w-2.5" />
                    ) : (
                      <ImageIcon className="h-2.5 w-2.5" />
                    )}
                    <span className="uppercase">{asset.mode}</span>
                  </span>
                  <span className="rounded-lg bg-black/60 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 backdrop-blur-md">
                    {asset.aspectRatio}
                  </span>
                </div>

                {/* Favorite Action Button Top Right */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(asset.id);
                  }}
                  className="absolute right-2.5 top-2.5 rounded-lg bg-black/60 p-1.5 text-white backdrop-blur-md transition-colors hover:bg-black/80"
                >
                  <Heart
                    className={`h-3.5 w-3.5 ${
                      asset.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-300'
                    }`}
                  />
                </button>

                {/* Reference indicator */}
                {asset.referenceImage && (
                  <span className="absolute bottom-2 right-2 rounded bg-cyan-950/80 px-1.5 py-0.5 text-[9px] font-medium text-cyan-300 backdrop-blur">
                    Ref Used
                  </span>
                )}
              </div>

              {/* Card Content & Details */}
              <div className="flex flex-1 flex-col justify-between p-4">
                <div className="space-y-1.5">
                  <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-slate-200 group-hover:text-white">
                    {asset.originalPrompt}
                  </p>
                  {asset.aiPlan?.intent && (
                    <p className="line-clamp-1 text-[11px] text-cyan-400/80">
                      {asset.aiPlan.intent}
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 text-[11px] text-slate-400">
                  <span className="font-mono text-[10px]">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemix(asset);
                      }}
                      className="rounded-lg p-1.5 hover:bg-white/10 hover:text-cyan-300"
                      title="Remix in Studio"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleDownload(e, asset)}
                      className="rounded-lg p-1.5 hover:bg-white/10 hover:text-white"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(asset.id);
                      }}
                      className="rounded-lg p-1.5 hover:bg-rose-500/20 hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
