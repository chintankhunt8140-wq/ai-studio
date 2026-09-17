import {
  AIBrainPlan,
  AspectRatio,
  CreationAsset,
  GenerationJob,
  GenerationMode,
  ReferenceImage,
  SystemStats,
  UserProfile,
  VideoMotionConfig,
} from '../types';

let sessionUserId: string = 'user_creator_1';

export function setSessionUserId(id: string) {
  sessionUserId = id;
}

export function getSessionUserId(): string {
  return sessionUserId;
}

function getAuthHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-user-id': sessionUserId,
  };
}

export async function fetchHealth(): Promise<{ status: string; hasGeminiKey: boolean }> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchUsers(): Promise<UserProfile[]> {
  const res = await fetch('/api/auth/users');
  if (!res.ok) throw new Error('Failed to load users');
  return res.json();
}

export async function fetchCurrentUser(userId?: string): Promise<UserProfile> {
  const id = userId || sessionUserId;
  const res = await fetch(`/api/auth/current?userId=${encodeURIComponent(id)}`, {
    headers: { 'x-user-id': id },
  });
  if (!res.ok) throw new Error('Failed to load current user');
  const user = await res.json();
  if (user?.id) {
    sessionUserId = user.id;
  }
  return user;
}

export async function enhancePrompt(params: {
  mode: GenerationMode;
  rawPrompt: string;
  referenceImage?: ReferenceImage;
  aspectRatio: AspectRatio;
  videoMotion?: VideoMotionConfig;
  userId?: string;
}): Promise<AIBrainPlan> {
  const res = await fetch('/api/brain/enhance', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...params,
      userId: params.userId || sessionUserId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Enhance failed' }));
    throw new Error(err.error || 'Failed to enhance prompt');
  }
  return res.json();
}

export async function createGenerationJob(params: {
  userId: string;
  userName: string;
  mode: GenerationMode;
  prompt: string;
  referenceImage?: ReferenceImage;
  aspectRatio: AspectRatio;
  videoMotion?: VideoMotionConfig;
}): Promise<GenerationJob> {
  const res = await fetch('/api/jobs/create', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create job' }));
    throw new Error(err.error || 'Failed to create job');
  }
  return res.json();
}

export async function getJob(jobId: string): Promise<GenerationJob> {
  const res = await fetch(`/api/jobs/${jobId}`, {
    headers: { 'x-user-id': sessionUserId },
  });
  if (!res.ok) throw new Error('Job not found');
  return res.json();
}

export async function cancelJob(jobId: string): Promise<boolean> {
  const res = await fetch(`/api/jobs/${jobId}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.success;
}

export async function retryJob(jobId: string): Promise<GenerationJob> {
  const res = await fetch(`/api/jobs/${jobId}/retry`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to retry job' }));
    throw new Error(err.error || 'Failed to retry job');
  }
  return res.json();
}

export async function fetchCreations(filter?: {
  mode?: string;
  userId?: string;
  search?: string;
  favoriteOnly?: boolean;
}): Promise<CreationAsset[]> {
  const params = new URLSearchParams();
  if (filter?.mode) params.append('mode', filter.mode);
  if (filter?.userId) params.append('userId', filter.userId);
  if (filter?.search) params.append('search', filter.search);
  if (filter?.favoriteOnly) params.append('favoriteOnly', 'true');

  const res = await fetch(`/api/creations?${params.toString()}`, {
    headers: { 'x-user-id': sessionUserId },
  });
  if (!res.ok) throw new Error('Failed to load creations');
  return res.json();
}

export async function toggleFavoriteCreation(id: string): Promise<boolean> {
  const res = await fetch(`/api/creations/${id}/favorite`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to toggle favorite' }));
    throw new Error(err.error || 'Failed to toggle favorite');
  }
  const data = await res.json();
  return data.isFavorite;
}

export async function deleteCreation(id: string): Promise<boolean> {
  const res = await fetch(`/api/creations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete' }));
    throw new Error(err.error || 'Failed to delete');
  }
  const data = await res.json();
  return data.success;
}

export async function fetchSystemStats(userId?: string): Promise<SystemStats> {
  const url = userId ? `/api/stats?userId=${encodeURIComponent(userId)}` : '/api/stats';
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load stats');
  return res.json();
}

export async function fetchAdminSettings(): Promise<any> {
  const res = await fetch('/api/admin/settings', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load settings');
  return res.json();
}

export async function updateAdminSettings(settings: any): Promise<any> {
  const res = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}
