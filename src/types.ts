export type GenerationMode = 'image' | 'video';

export type JobStatus =
  | 'created'
  | 'queued'
  | 'analyzing'
  | 'planning'
  | 'generating'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9';

export interface ReferenceImage {
  dataUrl: string;
  name?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  fileSize?: number;
  width?: number;
  height?: number;
  storageUrl?: string;
}

export interface VideoMotionConfig {
  subjectMotion?: string;
  cameraMovement?: string;
  speed?: 'slow' | 'medium' | 'fast' | 'dynamic';
  environmentMotion?: string;
  cinematicDirection?: string;
  targetDurationSeconds?: number;
}

export interface AIBrainPlan {
  originalPrompt: string;
  enhancedPrompt: string;
  intent: string;
  visualStyle: string;
  composition: string;
  subjectDetails: string;
  lighting: string;
  colorPalette?: string[];
  referencePreservation?: string[];
  negativeConstraints: string;
  generationSettings?: {
    model?: string;
    aspectRatio?: AspectRatio;
    resolution?: string;
    durationSeconds?: number;
  };
  videoPlan?: {
    cameraMovement: string;
    subjectMotion: string;
    environmentMotion: string;
    speed: string;
    cinematicDirection: string;
    durationSeconds: number;
    timelineKeyframes: string[];
  };
}

export interface CreationAsset {
  id: string;
  userId: string;
  userName: string;
  mode: GenerationMode;
  status: JobStatus;
  originalPrompt: string;
  enhancedPrompt: string;
  aiPlan?: AIBrainPlan;
  mediaUrl: string; // URL to image or video
  thumbnailUrl?: string;
  referenceImageUrl?: string;
  referenceImage?: ReferenceImage;
  aspectRatio: AspectRatio;
  durationSeconds?: number; // e.g. 10 for video
  fileSizeBytes?: number;
  mimeType: string;
  provider: string; // 'gemini-3.1-flash-lite-image' | 'gemini-3.1-flash-image' | 'veo-3.1-lite' | 'veo-3.1'
  createdAt: number;
  completedAt?: number;
  isFavorite?: boolean;
  metadata?: {
    seed?: number;
    resolution?: string;
    fps?: number;
    renderTimeMs?: number;
    model?: string;
    operationName?: string;
  };
}

export interface GenerationJob {
  id: string;
  userId: string;
  userName: string;
  mode: GenerationMode;
  prompt: string;
  enhancedPrompt?: string;
  referenceImage?: ReferenceImage;
  aspectRatio: AspectRatio;
  videoMotion?: VideoMotionConfig;
  status: JobStatus;
  progress: number; // 0 to 100
  currentStepMessage: string;
  logs: Array<{ timestamp: number; message: string; step: string }>;
  aiPlan?: AIBrainPlan;
  provider?: string;
  providerJobId?: string;
  result?: CreationAsset;
  error?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'creator' | 'admin' | 'guest';
  avatarColor: string;
  stats: {
    imagesGenerated: number;
    videosGenerated: number;
    totalRenderSeconds: number;
    promptEnhancements: number;
  };
  usage?: {
    totalCreations: number;
    imagesGenerated: number;
    videosGenerated: number;
    promptsImproved: number;
    videoSecondsRendered: number;
  };
}

export interface SystemStats {
  totalCreations: number;
  totalImages: number;
  totalVideos: number;
  activeJobsCount: number;
  completedJobsCount: number;
  failedJobsCount: number;
  uptimeSeconds?: number;
  hasGeminiKey?: boolean;
  queue?: {
    running: number;
    queued: number;
    completed: number;
    failed: number;
  };
  creations?: {
    total: number;
    images: number;
    videos: number;
  };
  storage?: {
    bytes: number;
    sizeFormatted: string;
    fileCount: number;
  };
  providers?: {
    geminiImage: { status: 'online' | 'degraded' | 'unconfigured'; model: string };
    veoVideo: { status: 'online' | 'standby' | 'unconfigured' | 'fallback_ready'; model: string };
    cinematicEngine?: { status: 'online' | 'offline'; engine: string };
  };
  storageUsedBytes: number;
  averageRenderTimeSec: number;
  dailyTrends?: { date: string; images: number; videos: number; total: number }[];
}
