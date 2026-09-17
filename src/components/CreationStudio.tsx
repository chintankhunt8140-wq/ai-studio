import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Film,
  Image as ImageIcon,
  Upload,
  X,
  Wand2,
  ChevronDown,
  Layers,
  Camera,
  Play,
  ArrowRight,
  Info,
  CheckCircle2,
  RefreshCw,
  Eye,
  Palette,
  Plus,
} from 'lucide-react';
import {
  AIBrainPlan,
  AspectRatio,
  GenerationMode,
  ReferenceImage,
  VideoMotionConfig,
} from '../types';

interface CreationStudioProps {
  mode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  referenceImage: ReferenceImage | null;
  onReferenceImageChange: (image: ReferenceImage | null) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (aspectRatio: AspectRatio) => void;
  videoMotion: VideoMotionConfig;
  onVideoMotionChange: (config: VideoMotionConfig) => void;
  onImprovePrompt: () => void;
  isImproving: boolean;
  improvedPlan: AIBrainPlan | null;
  onApplyImprovedPrompt: (enhancedText: string) => void;
  onClearImprovedPlan: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const INSPIRATION_PROMPTS = {
  image: [
    'Bioluminescent crystal cave with glowing turquoise subterranean waterfall, 8k cinematic photography',
    'Cyberpunk ramen shop under pouring rain with neon reflections in puddles, atmospheric lighting',
    'Ethereal marble sculpture covered in delicate golden kintsugi moss and wild blooming orchids',
    'Futuristic architectural villa suspended over Norwegian fjords at sunset, minimalist brutalist design',
  ],
  video: [
    'Cinematic aerial drone glide through misty alpine pine forest as morning sun rays pierce the fog',
    'Futuristic hovercraft racing at dusk across shimmering salt flats with glowing thrusters',
    'Macro camera push into blooming nocturnal lotus flower glowing with deep bioluminescent purple pollen',
    'Slow-motion 24fps tracking shot through retro-futuristic metropolis street market at twilight',
  ],
};

const ASPECT_RATIOS: { id: AspectRatio; label: string; ratio: string; icon: string }[] = [
  { id: '16:9', label: 'Landscape', ratio: '16:9', icon: 'w-6 h-3.5' },
  { id: '1:1', label: 'Square', ratio: '1:1', icon: 'w-4 h-4' },
  { id: '9:16', label: 'Portrait', ratio: '9:16', icon: 'w-3.5 h-6' },
  { id: '4:3', label: 'Standard', ratio: '4:3', icon: 'w-5 h-4' },
  { id: '21:9', label: 'Cinematic', ratio: '21:9', icon: 'w-7 h-3' },
];

const CAMERA_PRESETS = [
  'Continuous forward dolly glide',
  'Smooth 360 orbital tracking',
  'Low-altitude drone flythrough',
  'Steadicam follow with natural sway',
  'Dynamic cinematic crane ascent',
];

interface StylePreset {
  id: string;
  name: string;
  category: string;
  modifier: string;
  description: string;
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'cinematic-lighting',
    name: 'Cinematic Lighting',
    category: 'Lighting & Atmosphere',
    modifier: 'cinematic lighting, dramatic chiaroscuro, volumetric light rays, 35mm anamorphic lens, shallow depth of field, 8k resolution',
    description: 'Dramatic illumination with volumetric rays and rich shadows',
  },
  {
    id: 'cyberpunk-aesthetic',
    name: 'Cyberpunk Aesthetic',
    category: 'Vibe & Worldbuilding',
    modifier: 'cyberpunk aesthetic, vibrant neon reflections, rain-slicked city streets, moody high-tech atmosphere, teal and magenta palette',
    description: 'Futuristic neon glow with reflective wet street textures',
  },
  {
    id: 'hyperrealistic-photo',
    name: 'Hyperrealistic Photography',
    category: 'Realism & Film',
    modifier: 'hyperrealistic photography, Hasselblad medium format, sharp optical focus, pristine natural lighting, authentic textures',
    description: 'Ultra-crisp commercial editorial photography look',
  },
  {
    id: 'anime-ghibli',
    name: 'Anime / Studio Ghibli',
    category: 'Artistic & Illustrated',
    modifier: 'anime style aesthetic, Studio Ghibli inspired, lush hand-painted scenery, radiant golden hour lighting, whimsical atmosphere',
    description: 'Warm, painted anime aesthetic with lush vistas',
  },
  {
    id: 'dark-fantasy',
    name: 'Dark Fantasy & Moody',
    category: 'Vibe & Worldbuilding',
    modifier: 'dark fantasy aesthetic, ominous atmospheric fog, moody chiaroscuro lighting, intricate gothic details, dark muted palette',
    description: 'Eldritch gothic atmosphere with deep shadows',
  },
  {
    id: 'retro-synthwave',
    name: 'Retro Synthwave (80s)',
    category: 'Vibe & Worldbuilding',
    modifier: 'retro 80s synthwave aesthetic, neon cyan and magenta glow, wireframe horizon, VHS retro scanlines, outrun nostalgia',
    description: 'Outrun 80s retro aesthetics with glowing grids',
  },
  {
    id: 'surrealist-dream',
    name: 'Surrealist Dreamscape',
    category: 'Artistic & Illustrated',
    modifier: 'surrealist dreamscape, Salvador Dalí inspired, floating impossible geometry, mystical otherworldly lighting, fine art painting',
    description: 'Mind-bending surrealism and dreamlike physics',
  },
  {
    id: 'minimalist-arch',
    name: 'Minimalist Architecture',
    category: 'Design & Form',
    modifier: 'minimalist architectural aesthetic, clean geometric lines, warm stone textures, natural diffuse daylight, elegant negative space',
    description: 'Clean lines, warm stone, and pristine balance',
  },
  {
    id: 'vintage-film-noir',
    name: 'Vintage Film Noir',
    category: 'Realism & Film',
    modifier: 'vintage 1940s film noir, high-contrast monochrome, dramatic venetian blind shadows, silhouetted mystery, authentic silver gelatin grain',
    description: 'Black-and-white dramatic mystery shadows',
  },
  {
    id: 'watercolor-wash',
    name: 'Watercolor & Ink Wash',
    category: 'Artistic & Illustrated',
    modifier: 'delicate watercolor painting, soft pigment bleeding, traditional sumi-e ink wash splatters, raw textured cold-press paper',
    description: 'Expressive translucent pigments on paper',
  },
  {
    id: 'bioluminescent-glow',
    name: 'Bioluminescent Sci-Fi',
    category: 'Lighting & Atmosphere',
    modifier: 'bioluminescent organic glow, luminous deep-sea flora, glowing cyan and electric violet micro-particles, subterranean darkness',
    description: 'Glowing organic neon flora and fauna',
  },
  {
    id: 'claymation-stopmotion',
    name: 'Claymation & Stop Motion',
    category: 'Artistic & Illustrated',
    modifier: 'claymation stop-motion style, plasticine fingerprint textures, tactile miniature set, whimsical studio lighting, handcrafted charm',
    description: 'Handcrafted plasticine tactile stop-motion look',
  },
];

const STYLE_CATEGORIES = Array.from(new Set(STYLE_PRESETS.map((p) => p.category)));

export const CreationStudio: React.FC<CreationStudioProps> = ({
  mode,
  onModeChange,
  prompt,
  onPromptChange,
  referenceImage,
  onReferenceImageChange,
  aspectRatio,
  onAspectRatioChange,
  videoMotion,
  onVideoMotionChange,
  onImprovePrompt,
  isImproving,
  improvedPlan,
  onApplyImprovedPrompt,
  onClearImprovedPlan,
  onGenerate,
  isGenerating,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string>('');
  const [lastAppendedStyle, setLastAppendedStyle] = useState<string | null>(null);

  const handleApplyStylePreset = (presetId: string) => {
    if (!presetId) return;
    const preset = STYLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const modifierText = preset.modifier;
    const trimmed = prompt.trim();
    let updated = '';

    if (!trimmed) {
      updated = modifierText.charAt(0).toUpperCase() + modifierText.slice(1);
    } else if (trimmed.endsWith(',') || trimmed.endsWith(';')) {
      updated = `${trimmed} ${modifierText}`;
    } else if (trimmed.endsWith('.')) {
      updated = `${trimmed} Style details: ${modifierText}.`;
    } else {
      updated = `${trimmed}, ${modifierText}`;
    }

    onPromptChange(updated);
    setLastAppendedStyle(preset.name);
    setSelectedStyleId(preset.id);

    if (improvedPlan) {
      onClearImprovedPlan();
    }

    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Auto resize prompt textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(120, textareaRef.current.scrollHeight)}px`;
    }
  }, [prompt]);

  // Keyboard shortcut Ctrl/Cmd + Enter to trigger generation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (prompt.trim() && !isGenerating) {
          e.preventDefault();
          onGenerate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, isGenerating, onGenerate]);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        onReferenceImageChange({
          dataUrl,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          width: img.width,
          height: img.height,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Creation Mode Switcher Card */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-2 sm:flex-row sm:p-2.5">
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
          <button
            id="mode-switch-image"
            onClick={() => onModeChange('image')}
            className={`flex items-center justify-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
              mode === 'image'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            <span>Create Image</span>
          </button>

          <button
            id="mode-switch-video"
            onClick={() => onModeChange('video')}
            className={`flex items-center justify-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
              mode === 'video'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Film className="h-4 w-4" />
            <div className="flex items-center gap-1.5">
              <span>Create Video</span>
              <span className="rounded-full bg-indigo-400/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300">
                10s
              </span>
            </div>
          </button>
        </div>

        <div className="flex w-full items-center justify-between gap-3 px-2 sm:w-auto sm:justify-end sm:px-0">
          <span className="text-xs text-slate-400">
            {mode === 'image' ? 'Neural High-Res Image' : '10-Second 24FPS Cinematic Video'}
          </span>
          <button
            id="toggle-advanced-settings"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            <Camera className="h-3.5 w-3.5 text-cyan-400" />
            <span>Settings</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${
                showAdvancedSettings ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Creation Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 p-5 shadow-2xl shadow-black/60 sm:p-7">
        {/* Subtle glowing ambient backdrop */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative space-y-5">
          {/* Prompt Header & Brain Improvement Trigger */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="prompt-input" className="text-sm font-semibold text-white">
              Describe your vision
            </label>

            <div className="flex items-center gap-2">
              {improvedPlan && (
                <button
                  id="view-ai-plan-btn"
                  onClick={() => setShowPlanModal(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-900/40"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>View AI Brain Plan</span>
                </button>
              )}

              <button
                id="improve-prompt-button"
                onClick={onImprovePrompt}
                disabled={!prompt.trim() || isImproving || isGenerating}
                className="group flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 transition-all hover:border-cyan-400 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Wand2
                  className={`h-3.5 w-3.5 text-cyan-400 transition-transform ${
                    isImproving ? 'animate-spin' : 'group-hover:rotate-12'
                  }`}
                />
                <span>{isImproving ? 'Brain Analyzing...' : 'Improve Prompt'}</span>
              </button>
            </div>
          </div>

          {/* Prompt Input Box */}
          <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 p-3.5 transition-all focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/20">
            <textarea
              id="prompt-input"
              ref={textareaRef}
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder={
                mode === 'image'
                  ? 'E.g., An ancient stone library submerged in a sunlit turquoise lagoon, bioluminescent corals clinging to pillars, cinematic lighting, 8k...'
                  : 'E.g., Cinematic slow-motion drone flythrough of a neon rainy cyberpunk street, camera gliding past holographic signs into an alleyway...'
              }
              rows={3}
              className="w-full resize-none bg-transparent font-sans text-sm leading-relaxed text-slate-100 placeholder-slate-500 focus:outline-none"
            />

            <div className="flex items-center justify-between border-t border-white/5 pt-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                {prompt.length > 0 && (
                  <button
                    id="clear-prompt-btn"
                    onClick={() => {
                      onPromptChange('');
                      onClearImprovedPlan();
                    }}
                    className="hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}
                <span>{prompt.length} characters</span>
              </div>
              <span className="hidden text-[11px] text-slate-500 sm:inline">
                Press <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">⌘+Enter</kbd> to generate
              </span>
            </div>
          </div>

          {/* Style Preset Selector Section */}
          <div
            id="style-preset-section"
            className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3.5 sm:p-4 transition-all"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-cyan-400">
                  <Palette className="h-4 w-4" />
                </div>
                <div>
                  <label htmlFor="style-preset-select" className="text-xs font-semibold text-white">
                    Style Preset
                  </label>
                  <span className="ml-2 hidden text-[11px] text-slate-400 sm:inline">
                    Append artistic lighting &amp; atmospheric modifiers
                  </span>
                </div>
              </div>

              {lastAppendedStyle && (
                <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/50 px-2.5 py-0.5 text-[11px] font-medium text-cyan-300">
                  <CheckCircle2 className="h-3 w-3 text-cyan-400" />
                  <span>Appended: {lastAppendedStyle}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <select
                  id="style-preset-select"
                  name="stylePreset"
                  aria-label="Style Preset"
                  value={selectedStyleId}
                  onChange={(e) => {
                    const presetId = e.target.value;
                    if (presetId) {
                      handleApplyStylePreset(presetId);
                    }
                  }}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-slate-900/90 py-2.5 pl-3.5 pr-10 text-xs font-medium text-slate-100 placeholder-slate-400 transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="" disabled>
                    Choose a Style Preset to append... (e.g. Cinematic Lighting, Cyberpunk Aesthetic)
                  </option>
                  {STYLE_CATEGORIES.map((category) => (
                    <optgroup key={category} label={category} className="bg-slate-900 text-slate-300 font-semibold">
                      {STYLE_PRESETS.filter((p) => p.category === category).map((preset) => (
                        <option key={preset.id} value={preset.id} className="bg-slate-950 text-slate-100 font-normal">
                          {preset.name} — {preset.description}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>

              <button
                id="apply-style-preset-btn"
                type="button"
                onClick={() => {
                  if (selectedStyleId) {
                    handleApplyStylePreset(selectedStyleId);
                  }
                }}
                disabled={!selectedStyleId}
                className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2.5 text-xs font-semibold text-cyan-300 transition-all hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5 text-cyan-400" />
                <span>Append Modifier</span>
              </button>
            </div>

            {/* Quick-Access Popular Preset Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Popular:
              </span>
              {[
                'cinematic-lighting',
                'cyberpunk-aesthetic',
                'hyperrealistic-photo',
                'anime-ghibli',
                'retro-synthwave',
              ].map((id) => {
                const preset = STYLE_PRESETS.find((p) => p.id === id);
                if (!preset) return null;
                const isSelected = selectedStyleId === preset.id;
                return (
                  <button
                    key={preset.id}
                    id={`quick-style-${preset.id}`}
                    type="button"
                    onClick={() => handleApplyStylePreset(preset.id)}
                    className={`group flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-200'
                        : 'border-white/5 bg-slate-900/80 text-slate-300 hover:border-cyan-500/40 hover:bg-cyan-950/40 hover:text-cyan-200'
                    }`}
                  >
                    <Sparkles className="h-2.5 w-2.5 text-cyan-400 transition-transform group-hover:scale-110" />
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Brain Improvement Banner (if enhanced) */}
          {improvedPlan && (
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-indigo-950/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      AI Brain Enhanced Prompt
                    </span>
                    <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                      Intent: {improvedPlan.intent.slice(0, 45)}...
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-200">
                    {improvedPlan.enhancedPrompt}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    id="apply-improved-prompt-btn"
                    onClick={() => onApplyImprovedPrompt(improvedPlan.enhancedPrompt)}
                    className="rounded-lg bg-cyan-500 px-2.5 py-1 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
                  >
                    Use Prompt
                  </button>
                  <button
                    id="dismiss-improved-prompt-btn"
                    onClick={onClearImprovedPlan}
                    className="rounded-lg p-1 text-slate-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reference Image Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium">Optional Reference Image</span>
                <span className="text-slate-500">(Style, Subject, &amp; Composition guidance)</span>
              </div>
              {referenceImage && (
                <button
                  id="clear-ref-image-btn"
                  onClick={() => onReferenceImageChange(null)}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300"
                >
                  <X className="h-3 w-3" />
                  <span>Remove Image</span>
                </button>
              )}
            </div>

            {referenceImage ? (
              <div className="flex items-center gap-4 rounded-2xl border border-cyan-500/30 bg-slate-950/60 p-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-800">
                  <img
                    src={referenceImage.dataUrl}
                    alt="Reference"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] font-mono text-white">
                    {referenceImage.width}x{referenceImage.height}
                  </span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      {referenceImage.fileName}
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      Preserved in AI Brain Plan
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {(referenceImage.fileSize / 1024).toFixed(1)} KB • The AI Brain will preserve subject silhouette, lighting atmosphere, and color contours.
                  </p>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group flex cursor-pointer items-center justify-between rounded-2xl border-2 border-dashed p-4 transition-all ${
                  isDragging
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-white/10 bg-slate-950/40 hover:border-white/20 hover:bg-slate-950/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 text-slate-400 group-hover:text-cyan-400">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-200">
                      Drag &amp; drop an image, or <span className="text-cyan-400 underline">browse</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Supports JPG, PNG, WEBP up to 20MB
                    </div>
                  </div>
                </div>
                <span className="rounded-lg border border-white/10 bg-slate-800/60 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                  Select
                </span>
              </div>
            )}
          </div>

          {/* Inspiration Prompts Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Quick Ideas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {INSPIRATION_PROMPTS[mode].map((sample, idx) => (
                <button
                  key={idx}
                  id={`inspiration-chip-${idx}`}
                  onClick={() => {
                    onPromptChange(sample);
                    onClearImprovedPlan();
                  }}
                  className="rounded-lg border border-white/5 bg-slate-800/40 px-2.5 py-1 text-left text-xs text-slate-400 transition-colors hover:border-white/15 hover:bg-slate-800 hover:text-slate-200"
                >
                  {sample.slice(0, 48)}...
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings Drawer (Aspect Ratio & Camera Motion) */}
          {showAdvancedSettings && (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              {/* Aspect Ratio */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Aspect Ratio</span>
                  <span className="font-mono text-cyan-400">{aspectRatio}</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {ASPECT_RATIOS.map((item) => (
                    <button
                      key={item.id}
                      id={`aspect-ratio-${item.id.replace(':', '-')}`}
                      onClick={() => onAspectRatioChange(item.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all ${
                        aspectRatio === item.id
                          ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                          : 'border-white/5 bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex h-7 items-center justify-center">
                        <div
                          className={`rounded border ${
                            aspectRatio === item.id ? 'border-cyan-400 bg-cyan-400/30' : 'border-slate-500'
                          } ${item.icon}`}
                        />
                      </div>
                      <span className="text-[11px] font-medium">{item.label}</span>
                      <span className="text-[10px] text-slate-500">{item.ratio}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Video Specific Controls */}
              {mode === 'video' && (
                <div className="space-y-3 border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      Camera Motion &amp; Kinematics (10s Timeline)
                    </span>
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                      24 FPS • Master
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Camera Movement</label>
                      <select
                        id="camera-movement-select"
                        value={videoMotion.cameraMovement || CAMERA_PRESETS[0]}
                        onChange={(e) =>
                          onVideoMotionChange({
                            ...videoMotion,
                            cameraMovement: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                      >
                        {CAMERA_PRESETS.map((cam) => (
                          <option key={cam} value={cam}>
                            {cam}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Pacing / Speed</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['slow', 'medium', 'dynamic'] as const).map((spd) => (
                          <button
                            key={spd}
                            id={`speed-btn-${spd}`}
                            onClick={() =>
                              onVideoMotionChange({
                                ...videoMotion,
                                speed: spd,
                              })
                            }
                            className={`rounded-xl border py-2 text-xs font-medium capitalize transition-colors ${
                              videoMotion.speed === spd
                                ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                                : 'border-white/5 bg-slate-900 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {spd}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Row & Primary Generate Button */}
          <div className="flex flex-col items-center justify-between gap-4 pt-2 sm:flex-row">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
              <span>
                {mode === 'image'
                  ? 'AI Brain will plan composition, lighting & negative constraints'
                  : 'AI Brain will choreograph 10-second camera timeline & motion dynamics'}
              </span>
            </div>

            <button
              id="generate-button"
              onClick={onGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={`relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl px-8 py-3.5 text-sm font-bold text-white shadow-xl transition-all sm:w-auto ${
                !prompt.trim() || isGenerating
                  ? 'cursor-not-allowed bg-slate-800 text-slate-500 shadow-none'
                  : mode === 'image'
                  ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 shadow-cyan-500/25 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 hover:shadow-cyan-500/40 active:scale-[0.98]'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-indigo-500/25 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40 active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing Vision...</span>
                </>
              ) : mode === 'image' ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Image</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <Film className="h-4 w-4" />
                  <span>Generate 10s Video</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Brain Plan Modal */}
      {showPlanModal && improvedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-400" />
                <h3 className="font-display text-lg font-bold text-white">
                  AI Brain Architectural Plan
                </h3>
              </div>
              <button
                id="close-plan-modal-btn"
                onClick={() => setShowPlanModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-cyan-400">
                  Detected Intent
                </span>
                <p className="text-slate-200">{improvedPlan.intent}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/5 bg-slate-950/60 p-3.5">
                <div>
                  <span className="text-slate-400">Visual Style</span>
                  <div className="font-medium text-white">{improvedPlan.visualStyle}</div>
                </div>
                <div>
                  <span className="text-slate-400">Lighting</span>
                  <div className="font-medium text-white">{improvedPlan.lighting}</div>
                </div>
                <div>
                  <span className="text-slate-400">Composition</span>
                  <div className="font-medium text-white">{improvedPlan.composition}</div>
                </div>
                <div>
                  <span className="text-slate-400">Subject Details</span>
                  <div className="font-medium text-white">{improvedPlan.subjectDetails}</div>
                </div>
              </div>

              {improvedPlan.colorPalette && (
                <div className="space-y-1.5">
                  <span className="font-bold uppercase tracking-wider text-slate-400">
                    Engine Color Palette
                  </span>
                  <div className="flex items-center gap-2">
                    {improvedPlan.colorPalette.map((color, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950 px-2 py-1">
                        <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="font-mono text-[11px] text-slate-300">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {improvedPlan.videoPlan && (
                <div className="space-y-2 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3.5">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold uppercase tracking-wider">
                    <Film className="h-4 w-4" />
                    <span>10-Second Video Motion Keyframes</span>
                  </div>
                  <div className="space-y-1">
                    {improvedPlan.videoPlan.timelineKeyframes?.map((kf, i) => (
                      <div key={i} className="flex items-center gap-2 text-slate-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                        <span>{kf}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-rose-400">
                  Negative Constraints Guardrails
                </span>
                <p className="text-slate-400">{improvedPlan.negativeConstraints}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
              <button
                id="apply-from-modal-btn"
                onClick={() => {
                  onApplyImprovedPrompt(improvedPlan.enhancedPrompt);
                  setShowPlanModal(false);
                }}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
              >
                Apply Enhanced Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
