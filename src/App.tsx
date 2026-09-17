import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { CreationStudio } from './components/CreationStudio';
import { GenerationMonitor } from './components/GenerationMonitor';
import { ResultShowcase } from './components/ResultShowcase';
import { HistoryLibrary } from './components/HistoryLibrary';
import { AssetModal } from './components/AssetModal';
import { AdminDashboard } from './components/AdminDashboard';
import { UserAuthModal } from './components/UserAuthModal';
import { InstallAppModal } from './components/InstallAppModal';
import { MobileNavBar } from './components/MobileNavBar';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  AIBrainPlan,
  AspectRatio,
  CreationAsset,
  GenerationJob,
  GenerationMode,
  ReferenceImage,
  UserProfile,
  VideoMotionConfig,
} from './types';
import {
  cancelJob,
  createGenerationJob,
  deleteCreation,
  enhancePrompt,
  fetchCreations,
  fetchCurrentUser,
  fetchHealth,
  fetchUsers,
  getJob,
  retryJob,
  setSessionUserId,
  toggleFavoriteCreation,
} from './lib/api';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  // Navigation & modals
  const [currentTab, setCurrentTab] = useState<'studio' | 'library' | 'admin'>('studio');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [modalAsset, setModalAsset] = useState<CreationAsset | null>(null);

  // System & User state
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [creations, setCreations] = useState<CreationAsset[]>([]);

  // Studio form state
  const [mode, setMode] = useState<GenerationMode>('image');
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [videoMotion, setVideoMotion] = useState<VideoMotionConfig>({
    cameraMovement: 'Continuous forward dolly glide',
    speed: 'medium',
  });

  // AI Brain & Generation state
  const [isImproving, setIsImproving] = useState(false);
  const [improvedPlan, setImprovedPlan] = useState<AIBrainPlan | null>(null);
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [latestAsset, setLatestAsset] = useState<CreationAsset | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{
    id: number;
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ id: Date.now(), type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Initial data loading
  useEffect(() => {
    const init = async () => {
      try {
        const [health, userList, curUser, creationList] = await Promise.all([
          fetchHealth().catch(() => ({ status: 'ok', hasGeminiKey: false })),
          fetchUsers().catch(() => []),
          fetchCurrentUser().catch(() => null),
          fetchCreations().catch(() => []),
        ]);

        setHasGeminiKey(Boolean(health.hasGeminiKey));
        setUsers(userList);
        if (curUser) {
          setCurrentUser(curUser);
          setSessionUserId(curUser.id);
        }
        setCreations(creationList);

        if (creationList.length > 0) {
          setLatestAsset(creationList[0]);
        }

        // Check if there was an active job running before page reload
        const savedJobId = localStorage.getItem('ai_studio_active_job_id');
        if (savedJobId) {
          try {
            const persistedJob = await getJob(savedJobId);
            if (persistedJob && !['completed', 'failed', 'cancelled'].includes(persistedJob.status)) {
              setActiveJob(persistedJob);
              showToast(`Resumed monitoring active job (${persistedJob.mode})...`, 'info');
            } else {
              localStorage.removeItem('ai_studio_active_job_id');
            }
          } catch {
            localStorage.removeItem('ai_studio_active_job_id');
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };
    init();
  }, []);

  // Polling active generation job
  useEffect(() => {
    if (!activeJob) return;
    if (activeJob.status === 'completed' || activeJob.status === 'failed' || activeJob.status === 'cancelled') return;

    const interval = setInterval(async () => {
      try {
        const updated = await getJob(activeJob.id);
        setActiveJob(updated);

        if (updated.status === 'completed' && updated.result) {
          localStorage.removeItem('ai_studio_active_job_id');
          setLatestAsset(updated.result);
          setCreations((prev) => [updated.result!, ...prev.filter((c) => c.id !== updated.result!.id)]);
          showToast(
            updated.mode === 'video'
              ? '10-Second Cinematic Video synthesized!'
              : 'Master Image synthesized successfully!',
            'success'
          );
          // Refresh user stats
          if (currentUser) {
            fetchCurrentUser(currentUser.id).then(setCurrentUser).catch(() => {});
          }
        } else if (updated.status === 'failed' || updated.status === 'cancelled') {
          localStorage.removeItem('ai_studio_active_job_id');
          if (updated.status === 'failed') {
            showToast(`Synthesis failed: ${updated.error || 'Unknown error'}`, 'error');
          }
        }
      } catch (err) {
        console.warn('Job poll error:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeJob, currentUser]);

  // AI Brain Prompt Improvement
  const handleImprovePrompt = async () => {
    if (!prompt.trim()) return;
    try {
      setIsImproving(true);
      const plan = await enhancePrompt({
        mode,
        rawPrompt: prompt,
        referenceImage: referenceImage || undefined,
        aspectRatio,
        videoMotion: mode === 'video' ? videoMotion : undefined,
        userId: currentUser?.id,
      });
      setImprovedPlan(plan);
      showToast('AI Brain analyzed prompt & synthesized visual roadmap!', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to enhance prompt', 'error');
    } finally {
      setIsImproving(false);
    }
  };

  // Submit Generation Job
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showToast('Please enter a description for your vision.', 'info');
      return;
    }

    if (activeJob && !['completed', 'failed', 'cancelled'].includes(activeJob.status)) {
      showToast('A generation job is already in progress. Please wait for it to complete.', 'info');
      setCurrentTab('studio');
      return;
    }

    const idempotencyKey = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const job = await createGenerationJob({
        userId: currentUser?.id || 'user_creator_1',
        userName: currentUser?.name || 'Creative Director',
        mode,
        prompt: prompt.trim(),
        referenceImage: referenceImage || undefined,
        aspectRatio,
        videoMotion: mode === 'video' ? videoMotion : undefined,
        idempotencyKey,
      });

      setActiveJob(job);
      localStorage.setItem('ai_studio_active_job_id', job.id);
      setCurrentTab('studio');
      showToast(
        mode === 'video'
          ? 'Enqueued 10-second cinematic video synthesis...'
          : 'Enqueued neural image synthesis...',
        'info'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to enqueue generation', 'error');
    }
  };

  // Cancel Generation
  const handleCancelJob = async () => {
    if (!activeJob) return;
    try {
      setIsCancelling(true);
      const ok = await cancelJob(activeJob.id);
      if (ok) {
        localStorage.removeItem('ai_studio_active_job_id');
        setActiveJob(null);
        showToast('Generation cancelled.', 'info');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCancelling(false);
    }
  };

  // Retry currently failed job
  const handleRetryActiveJob = async () => {
    if (!activeJob) return;
    try {
      const newJob = await retryJob(activeJob.id);
      setActiveJob(newJob);
      localStorage.setItem('ai_studio_active_job_id', newJob.id);
      showToast(`Retrying ${newJob.mode} generation...`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to retry job', 'error');
    }
  };

  // Regenerate an asset
  const handleRegenerate = async (asset: CreationAsset) => {
    setMode(asset.mode);
    setPrompt(asset.originalPrompt);
    setAspectRatio(asset.aspectRatio);
    if (asset.referenceImage) {
      setReferenceImage(asset.referenceImage);
    }
    setCurrentTab('studio');

    try {
      const job = await createGenerationJob({
        userId: currentUser?.id || 'user_creator_1',
        userName: currentUser?.name || 'Creative Director',
        mode: asset.mode,
        prompt: asset.originalPrompt,
        referenceImage: asset.referenceImage,
        aspectRatio: asset.aspectRatio,
        videoMotion: asset.aiPlan?.videoPlan
          ? {
              cameraMovement: asset.aiPlan.videoPlan.cameraMovement,
              speed: (asset.aiPlan.videoPlan.speed as any) || 'medium',
            }
          : undefined,
      });
      setActiveJob(job);
      showToast(`Regenerating ${asset.mode}...`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to regenerate', 'error');
    }
  };

  // Remix asset prompt in studio
  const handleRemix = (asset: CreationAsset) => {
    setMode(asset.mode);
    setPrompt(asset.originalPrompt);
    setAspectRatio(asset.aspectRatio);
    if (asset.referenceImage) {
      setReferenceImage(asset.referenceImage);
    }
    if (asset.aiPlan) {
      setImprovedPlan(asset.aiPlan);
    }
    setCurrentTab('studio');
    showToast('Loaded prompt & configuration into Studio.', 'info');
  };

  // Delete creation
  const handleDeleteCreation = async (id: string) => {
    try {
      const ok = await deleteCreation(id);
      if (ok) {
        setCreations((prev) => prev.filter((c) => c.id !== id));
        if (latestAsset?.id === id) {
          setLatestAsset(null);
        }
        if (modalAsset?.id === id) {
          setModalAsset(null);
        }
        showToast('Asset removed from library.', 'info');
      }
    } catch (err) {
      showToast('Failed to delete asset.', 'error');
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (id: string) => {
    try {
      const isFav = await toggleFavoriteCreation(id);
      setCreations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isFavorite: isFav } : c))
      );
      if (latestAsset?.id === id) {
        setLatestAsset((prev) => (prev ? { ...prev, isFavorite: isFav } : null));
      }
      if (modalAsset?.id === id) {
        setModalAsset((prev) => (prev ? { ...prev, isFavorite: isFav } : null));
      }
      showToast(isFav ? 'Added to favorites' : 'Removed from favorites', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-900/95 px-4 py-3 text-xs text-white shadow-2xl backdrop-blur-md">
          {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400" />}
          {toast.type === 'info' && <Info className="h-4 w-4 text-cyan-400" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        currentUser={currentUser}
        onOpenUserModal={() => setShowUserModal(true)}
        onOpenInstallModal={() => setShowInstallModal(true)}
        hasGeminiKey={hasGeminiKey}
        libraryCount={creations.length}
      />

      {/* Viewport Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 pb-28 md:pb-8 sm:px-6 lg:px-8">
        {currentTab === 'studio' && (
          <div className="space-y-12">
            {/* 1. Creation Interface */}
            <CreationStudio
              mode={mode}
              onModeChange={setMode}
              prompt={prompt}
              onPromptChange={setPrompt}
              referenceImage={referenceImage}
              onReferenceImageChange={setReferenceImage}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
              videoMotion={videoMotion}
              onVideoMotionChange={setVideoMotion}
              onImprovePrompt={handleImprovePrompt}
              isImproving={isImproving}
              improvedPlan={improvedPlan}
              onApplyImprovedPrompt={(text) => setPrompt(text)}
              onClearImprovedPlan={() => setImprovedPlan(null)}
              onGenerate={handleGenerate}
              isGenerating={Boolean(
                activeJob && activeJob.status !== 'completed' && activeJob.status !== 'failed'
              )}
            />

            {/* 2. Live Generation Monitor (when active or failed/cancelled) */}
            {activeJob && activeJob.status !== 'completed' && (
              <GenerationMonitor
                job={activeJob}
                onCancel={handleCancelJob}
                isCancelling={isCancelling}
                onRetry={handleRetryActiveJob}
                onDismiss={() => {
                  localStorage.removeItem('ai_studio_active_job_id');
                  setActiveJob(null);
                }}
              />
            )}

            {/* 3. Latest Result Showcase (when completed or available) */}
            {latestAsset && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-white">
                    Synthesized Masterpiece
                  </h3>
                  <button
                    onClick={() => setCurrentTab('library')}
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    View All {creations.length} in Library →
                  </button>
                </div>

                <ResultShowcase
                  asset={latestAsset}
                  onPreview={(asset) => setModalAsset(asset)}
                  onRegenerate={handleRegenerate}
                  onDelete={handleDeleteCreation}
                  onToggleFavorite={handleToggleFavorite}
                  onRemix={handleRemix}
                />
              </div>
            )}
          </div>
        )}

        {currentTab === 'library' && (
          <HistoryLibrary
            creations={creations}
            onSelectAsset={(asset) => setModalAsset(asset)}
            onRegenerate={handleRegenerate}
            onDelete={handleDeleteCreation}
            onToggleFavorite={handleToggleFavorite}
            onRemix={handleRemix}
            onNavigateStudio={() => setCurrentTab('studio')}
          />
        )}

        {currentTab === 'admin' && <AdminDashboard currentUser={currentUser} />}
      </main>

      {/* Lightbox / Asset Inspector Modal */}
      <AssetModal
        asset={modalAsset}
        onClose={() => setModalAsset(null)}
        onRegenerate={handleRegenerate}
        onDelete={handleDeleteCreation}
        onToggleFavorite={handleToggleFavorite}
        onRemix={handleRemix}
      />

      {/* User Account / Workspace Switcher Modal */}
      {showUserModal && (
        <UserAuthModal
          currentUser={currentUser}
          users={users}
          onSelectUser={(u) => {
            setCurrentUser(u);
            setSessionUserId(u.id);
            showToast(`Switched workspace to ${u.name}`, 'info');
          }}
          onClose={() => setShowUserModal(false)}
        />
      )}

      {/* Mobile Bottom Navigation (Native iPhone & Android style) */}
      <MobileNavBar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        currentUser={currentUser}
        onOpenUserModal={() => setShowUserModal(true)}
        onOpenInstallModal={() => setShowInstallModal(true)}
        libraryCount={creations.length}
      />

      {/* PWA Mobile Install Guide Modal for iPhone & Android */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />

      {/* Offline Connectivity Toast Indicator */}
      <OfflineIndicator />
    </div>
  );
}
