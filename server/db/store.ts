import fs from 'fs';
import path from 'path';
import { CreationAsset, GenerationJob, UserProfile, SystemStats } from '../../src/types';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

export interface AppDatabase {
  users: UserProfile[];
  creations: CreationAsset[];
  jobs: Record<string, GenerationJob>;
  settings: {
    defaultImageModel: string;
    defaultVideoModel: string;
    enableFallbackRenderer: boolean;
    autoEnhancePrompts: boolean;
    maxQueueConcurrency: number;
    videoResolution: string;
  };
}

const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user_creator_1',
    name: 'Creative Director',
    email: 'director@aistudio.internal',
    role: 'creator',
    avatarColor: 'from-violet-500 to-indigo-600',
    stats: {
      imagesGenerated: 0,
      videosGenerated: 0,
      totalRenderSeconds: 0,
      promptEnhancements: 0,
    }
  },
  {
    id: 'user_artist_2',
    name: 'Concept Artist',
    email: 'artist@aistudio.internal',
    role: 'creator',
    avatarColor: 'from-amber-500 to-rose-600',
    stats: {
      imagesGenerated: 0,
      videosGenerated: 0,
      totalRenderSeconds: 0,
      promptEnhancements: 0,
    }
  },
  {
    id: 'user_admin_root',
    name: 'Studio Admin',
    email: 'admin@aistudio.internal',
    role: 'admin',
    avatarColor: 'from-emerald-500 to-teal-600',
    stats: {
      imagesGenerated: 0,
      videosGenerated: 0,
      totalRenderSeconds: 0,
      promptEnhancements: 0,
    }
  }
];

class StoreManager {
  private db: AppDatabase;

  constructor() {
    this.db = this.loadFromDisk();
  }

  private loadFromDisk(): AppDatabase {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        return {
          users: parsed.users || DEFAULT_USERS,
          creations: parsed.creations || [],
          jobs: parsed.jobs || {},
          settings: {
            defaultImageModel: 'gemini-3.1-flash-lite-image',
            defaultVideoModel: 'veo-3.1-lite-generate-preview',
            enableFallbackRenderer: true,
            autoEnhancePrompts: true,
            maxQueueConcurrency: 3,
            videoResolution: '720p',
            ...(parsed.settings || {}),
          }
        };
      }
    } catch (err) {
      console.warn('Could not read store.json, using defaults:', err);
    }

    return {
      users: DEFAULT_USERS,
      creations: [],
      jobs: {},
      settings: {
        defaultImageModel: 'gemini-3.1-flash-lite-image',
        defaultVideoModel: 'veo-3.1-lite-generate-preview',
        enableFallbackRenderer: true,
        autoEnhancePrompts: true,
        maxQueueConcurrency: 3,
        videoResolution: '720p',
      }
    };
  }

  public saveToDisk(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting store.json:', err);
    }
  }

  // Users
  private enrichUser(u: UserProfile): UserProfile {
    const images = u.stats?.imagesGenerated || 0;
    const videos = u.stats?.videosGenerated || 0;
    const prompts = u.stats?.promptEnhancements || 0;
    const seconds = u.stats?.totalRenderSeconds || 0;
    return {
      ...u,
      stats: {
        imagesGenerated: images,
        videosGenerated: videos,
        totalRenderSeconds: seconds,
        promptEnhancements: prompts,
      },
      usage: {
        totalCreations: images + videos,
        imagesGenerated: images,
        videosGenerated: videos,
        promptsImproved: prompts,
        videoSecondsRendered: seconds,
      },
    };
  }

  public getUsers(): UserProfile[] {
    return this.db.users.map(u => this.enrichUser(u));
  }

  public getUser(id: string): UserProfile | undefined {
    const user = this.db.users.find(u => u.id === id);
    return user ? this.enrichUser(user) : undefined;
  }

  public updateUserStats(userId: string, update: Partial<UserProfile['stats']>): void {
    const user = this.getUser(userId);
    if (user) {
      user.stats = {
        imagesGenerated: user.stats.imagesGenerated + (update.imagesGenerated || 0),
        videosGenerated: user.stats.videosGenerated + (update.videosGenerated || 0),
        totalRenderSeconds: user.stats.totalRenderSeconds + (update.totalRenderSeconds || 0),
        promptEnhancements: user.stats.promptEnhancements + (update.promptEnhancements || 0),
      };
      this.saveToDisk();
    }
  }

  // Creations
  public getCreations(filter?: { mode?: string; userId?: string; search?: string; favoriteOnly?: boolean }): CreationAsset[] {
    let list = [...this.db.creations].sort((a, b) => b.createdAt - a.createdAt);
    if (!filter) return list;

    if (filter.mode && filter.mode !== 'all') {
      list = list.filter(c => c.mode === filter.mode);
    }
    if (filter.userId) {
      list = list.filter(c => c.userId === filter.userId);
    }
    if (filter.favoriteOnly) {
      list = list.filter(c => c.isFavorite);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(c => 
        c.originalPrompt.toLowerCase().includes(q) ||
        c.enhancedPrompt.toLowerCase().includes(q) ||
        (c.aiPlan?.visualStyle || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  public getCreation(id: string): CreationAsset | undefined {
    return this.db.creations.find(c => c.id === id);
  }

  public addCreation(asset: CreationAsset): void {
    // Avoid duplicates
    this.db.creations = [asset, ...this.db.creations.filter(c => c.id !== asset.id)];
    this.saveToDisk();
  }

  public toggleFavorite(id: string): boolean {
    const item = this.getCreation(id);
    if (item) {
      item.isFavorite = !item.isFavorite;
      this.saveToDisk();
      return item.isFavorite;
    }
    return false;
  }

  public deleteCreation(id: string): boolean {
    const initialLen = this.db.creations.length;
    this.db.creations = this.db.creations.filter(c => c.id !== id);
    if (this.db.creations.length !== initialLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  // Jobs
  public getJob(id: string): GenerationJob | undefined {
    return this.db.jobs[id];
  }

  public setJob(job: GenerationJob): void {
    this.db.jobs[job.id] = job;
    this.saveToDisk();
  }

  public getAllJobs(): GenerationJob[] {
    return Object.values(this.db.jobs).sort((a, b) => b.createdAt - a.createdAt);
  }

  // Settings
  public getSettings() {
    return this.db.settings;
  }

  public updateSettings(update: Partial<AppDatabase['settings']>) {
    this.db.settings = { ...this.db.settings, ...update };
    this.saveToDisk();
    return this.db.settings;
  }

  // System Stats
  public getSystemStats(): SystemStats {
    const creations = this.db.creations;
    const images = creations.filter(c => c.mode === 'image');
    const videos = creations.filter(c => c.mode === 'video');
    const jobs = Object.values(this.db.jobs);
    
    const active = jobs.filter(j => ['queued', 'analyzing', 'planning', 'generating', 'finalizing'].includes(j.status)).length;
    const queued = jobs.filter(j => j.status === 'queued').length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const failed = jobs.filter(j => j.status === 'failed').length;

    const totalRenderTime = creations.reduce((acc, c) => acc + (c.metadata?.renderTimeMs || 4000), 0);
    const avgRender = creations.length > 0 ? Math.round(totalRenderTime / creations.length / 1000) : 0;

    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
    const storageBytes = creations.reduce((acc, c) => acc + (c.fileSizeBytes || 500000), 0);
    const storageMb = (storageBytes / (1024 * 1024)).toFixed(1);

    // Compute daily trends for the last 7 days
    const dailyTrendsMap = new Map<string, { images: number; videos: number; total: number }>();
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      dailyTrendsMap.set(dateStr, { images: 0, videos: 0, total: 0 });
    }

    creations.forEach(c => {
      const dateStr = new Date(c.createdAt).toISOString().split('T')[0];
      if (dailyTrendsMap.has(dateStr)) {
        const stats = dailyTrendsMap.get(dateStr)!;
        stats.total++;
        if (c.mode === 'image') stats.images++;
        if (c.mode === 'video') stats.videos++;
      }
    });

    const dailyTrends = Array.from(dailyTrendsMap.entries()).map(([date, counts]) => ({
      date: date.substring(5), // e.g., '09-16'
      ...counts
    }));

    return {
      totalCreations: creations.length,
      totalImages: images.length,
      totalVideos: videos.length,
      activeJobsCount: active,
      completedJobsCount: completed,
      failedJobsCount: failed,
      uptimeSeconds: Math.floor(process.uptime()),
      hasGeminiKey: hasKey,
      queue: {
        running: active,
        queued: queued,
        completed: completed,
        failed: failed,
      },
      creations: {
        total: creations.length,
        images: images.length,
        videos: videos.length,
      },
      storage: {
        bytes: storageBytes,
        sizeFormatted: `${storageMb} MB`,
        fileCount: creations.length,
      },
      providers: {
        geminiImage: {
          status: hasKey ? 'online' : 'unconfigured',
          model: this.db.settings.defaultImageModel,
        },
        veoVideo: {
          status: hasKey ? 'online' : 'standby',
          model: this.db.settings.defaultVideoModel,
        },
        cinematicEngine: {
          status: 'online',
          engine: 'Studio 10s Keyframe Motion Renderer v2.4',
        }
      },
      storageUsedBytes: storageBytes,
      averageRenderTimeSec: avgRender || 5,
      dailyTrends,
    };
  }
}

export const store = new StoreManager();
