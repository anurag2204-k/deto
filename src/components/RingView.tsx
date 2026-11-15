'use client';

import { useState } from 'react';
import { LightweightTopic, RingColor, RingFrequency } from '@/lib/types';
import { computeRingStatus, formatRingCadence, RING_COLORS } from '@/lib/logic';
import { TopicArtwork, TopicCategoryBadge } from '@/components/TopicArtwork';
import { updateTopicRing, logRingSession, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sparkles,
  Check,
  Clock,
  AlertCircle,
  Plus,
  BookOpen,
  Trash2,
  Loader2,
  Flame,
} from 'lucide-react';

interface RingViewProps {
  topics: LightweightTopic[];
  allTopics: LightweightTopic[];
  today: string;
  isOwner: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  onUnauthorized: () => void;
}

// Glowing Circular Activity Ring (Apple Watch aesthetic)
function CircularActivityRing({
  percent,
  status,
  size = 72,
  strokeWidth = 7,
  color = 'amber',
}: {
  percent: number;
  status: 'closed-today' | 'due-today' | 'overdue' | 'not-started';
  size?: number;
  strokeWidth?: number;
  color?: RingColor;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  const colorDef = RING_COLORS[color] || RING_COLORS.amber;

  const colorConfig = {
    'closed-today': {
      stroke: colorDef.hex,
      glow: colorDef.glow,
      bgStroke: colorDef.bgSubtle,
    },
    'due-today': {
      stroke: colorDef.hex,
      glow: colorDef.glow,
      bgStroke: 'rgba(255,255,255,0.06)',
    },
    overdue: {
      stroke: '#f43f5e',
      glow: 'rgba(244,63,94,0.35)',
      bgStroke: 'rgba(244,63,94,0.15)',
    },
    'not-started': {
      stroke: 'rgba(255,255,255,0.2)',
      glow: 'rgba(255,255,255,0.05)',
      bgStroke: 'rgba(255,255,255,0.05)',
    },
  }[status];

  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
        style={{ filter: `drop-shadow(0 0 6px ${colorConfig.glow})` }}
      >
        <defs>
          <linearGradient id="ring-gradient-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="ring-gradient-amber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="ring-gradient-rose" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
          <linearGradient id="ring-gradient-indigo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>

        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colorConfig.bgStroke}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Active Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colorConfig.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Central Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {status === 'closed-today' ? (
          <Check className="w-5 h-5 text-emerald-400 animate-in zoom-in-75 duration-300" />
        ) : status === 'overdue' ? (
          <AlertCircle className="w-5 h-5 text-rose-400" />
        ) : (
          <Flame className="w-5 h-5 text-amber-400" />
        )}
      </div>
    </div>
  );
}

export function RingView({
  topics,
  allTopics,
  today,
  isOwner,
  onRefresh,
  onOpenAddModal,
  onUnauthorized,
}: RingViewProps) {
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add from Queue Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedQueueTopicId, setSelectedQueueTopicId] = useState<string>('');
  const [selectedFrequency, setSelectedFrequency] = useState<RingFrequency>('4x-week');
  const [selectedColor, setSelectedColor] = useState<RingColor>('emerald');
  const [addingToRing, setAddingToRing] = useState(false);

  // Topics not yet in Ring
  const eligibleTopics = allTopics.filter((t) => !t.ring?.active);

  const handleLogSession = async (topicId: string, topicTitle: string) => {
    if (!isOwner) return;
    setLoggingId(topicId);
    setError(null);

    try {
      await logRingSession(topicId, today);
      setActionNotice(`🎉 Session logged for "${topicTitle}"! Habit ring closed for today.`);
      onRefresh();
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
      } else {
        setError('Failed to log habit session.');
      }
    } finally {
      setLoggingId(null);
    }
  };

  const handleUpdateFrequency = async (topicId: string, frequency: RingFrequency) => {
    if (!isOwner) return;
    try {
      await updateTopicRing(topicId, { active: true, frequency });
      onRefresh();
    } catch {
      setError('Failed to update habit frequency');
    }
  };

  const handleRemoveFromRing = async (topicId: string, topicTitle: string) => {
    if (!isOwner) return;
    if (confirm(`Remove "${topicTitle}" from your active habit rings?`)) {
      try {
        await updateTopicRing(topicId, { active: false, frequency: 'daily' });
        setActionNotice(`"${topicTitle}" removed from active habit rings.`);
        onRefresh();
        setTimeout(() => setActionNotice(null), 3000);
      } catch {
        setError('Failed to remove task from habit ring');
      }
    }
  };

  const handleAddExistingToRing = async () => {
    if (!selectedQueueTopicId || !isOwner) return;
    setAddingToRing(true);

    try {
      await updateTopicRing(selectedQueueTopicId, {
        active: true,
        frequency: selectedFrequency,
        color: selectedColor,
      });
      setAddModalOpen(false);
      setSelectedQueueTopicId('');
      onRefresh();
      setActionNotice('Task added to your active habit rings!');
      setTimeout(() => setActionNotice(null), 3000);
    } catch {
      setError('Failed to add task to habit ring');
    } finally {
      setAddingToRing(false);
    }
  };

  // Stats summary
  const closedTodayCount = topics.filter((t) => computeRingStatus(t.ring, today).status === 'closed-today').length;
  const dueTodayCount = topics.filter((t) => computeRingStatus(t.ring, today).status === 'due-today').length;
  const overdueCount = topics.filter((t) => computeRingStatus(t.ring, today).status === 'overdue').length;

  return (
    <div className="space-y-8">
      {/* Toast Notice */}
      {actionNotice && (
        <div
          role="status"
          className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-xs text-emerald-200 flex items-center gap-2.5 shadow-lg shadow-emerald-950/30 animate-in fade-in slide-in-from-top-2"
        >
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium text-white">{actionNotice}</span>
        </div>
      )}

      {error && (
        <div className="p-3 text-xs text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">
          {error}
        </div>
      )}

      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Habit Rings &amp; Cadences</span>
            </h2>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs px-2 py-0.5">
              Active Habits
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
            Track active habits and ongoing routines (Gym sessions, Distributed Systems, Coding, etc.). Set weekly or monthly targets to build lasting streaks.
          </p>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {eligibleTopics.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(true)}
                className="text-xs border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 gap-1.5 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add from Queue</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={onOpenAddModal}
              className="text-xs bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white gap-1.5 rounded-lg shadow-md shadow-amber-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </Button>
          </div>
        )}
      </div>

      {/* Stats Counter Strip */}
      {topics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-white/5 bg-zinc-950/60 backdrop-blur-md">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Active in Ring</span>
            <p className="text-xl font-bold text-white mt-0.5">{topics.length}</p>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-md">
            <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">Closed Today</span>
            <p className="text-xl font-bold text-emerald-300 mt-0.5">{closedTodayCount}</p>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-950/20 backdrop-blur-md">
            <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">Due Today</span>
            <p className="text-xl font-bold text-amber-300 mt-0.5">{dueTodayCount}</p>
          </div>

          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-950/20 backdrop-blur-md">
            <span className="text-[11px] uppercase tracking-wider text-rose-400 font-semibold">Needs Attention</span>
            <p className="text-xl font-bold text-rose-300 mt-0.5">{overdueCount}</p>
          </div>
        </div>
      )}

      {/* Main List of Active Rings */}
      {topics.length > 0 ? (
        <div className="space-y-4">
          {topics.map((topic) => {
            const ringStatus = computeRingStatus(topic.ring, today);
            const isLogging = loggingId === topic._id;
            const cadenceLabel = formatRingCadence(topic.ring);
            const topicColorKey = ((topic.ring?.color as RingColor) || 'amber');
            const colorDef = RING_COLORS[topicColorKey] || RING_COLORS.amber;

            return (
              <div
                key={topic._id}
                className={`relative rounded-2xl border p-5 sm:p-6 transition-all duration-200 bg-zinc-950/70 backdrop-blur-xl ${
                  ringStatus.status === 'closed-today'
                    ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                    : ringStatus.status === 'overdue'
                    ? 'border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.12)]'
                    : 'border-white/10'
                }`}
                style={
                  ringStatus.status === 'due-today'
                    ? { borderColor: colorDef.border, boxShadow: `0 0 20px ${colorDef.glow}` }
                    : {}
                }
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  {/* Left: Ring + Topic Info */}
                  <div className="flex items-start sm:items-center gap-4 sm:gap-5 w-full min-w-0">
                    {/* Visual Progress Ring */}
                    <CircularActivityRing
                      percent={ringStatus.progressPercent}
                      status={ringStatus.status}
                      size={68}
                      strokeWidth={6.5}
                      color={topicColorKey}
                    />

                    {/* Topic Artwork */}
                    <TopicArtwork title={topic.title} size="md" />

                    {/* Topic Title & Cadence */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <TopicCategoryBadge title={topic.title} />

                        <Badge
                          variant="secondary"
                          className="bg-white/5 border border-white/10 text-zinc-300 text-[11px] font-normal"
                        >
                          {cadenceLabel}
                        </Badge>

                        {ringStatus.status === 'closed-today' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <Check className="w-3.5 h-3.5" /> Closed Today
                          </span>
                        ) : ringStatus.status === 'overdue' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-semibold animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5" /> Not Done Yet!
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                            <Clock className="w-3.5 h-3.5" /> Session Due
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                        {topic.title}
                      </h3>

                      <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <span className="text-zinc-500">Cadence Reminder:</span>
                        <strong
                          className={
                            ringStatus.status === 'overdue'
                              ? 'text-rose-300 font-medium'
                              : ringStatus.status === 'closed-today'
                              ? 'text-emerald-300 font-medium'
                              : 'text-amber-300 font-medium'
                          }
                        >
                          {ringStatus.reminderText}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto shrink-0 justify-between sm:justify-end border-t md:border-t-0 pt-3 md:pt-0">
                    {/* Log Session Button */}
                    {isOwner && (
                      <Button
                        onClick={() => handleLogSession(topic._id, topic.title)}
                        disabled={isLogging}
                        className={`h-9 px-4 text-xs font-semibold rounded-xl gap-1.5 transition-all shadow-md ${
                          ringStatus.status === 'closed-today'
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10'
                            : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-amber-600/20'
                        }`}
                      >
                        {isLogging ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Logging...</span>
                          </>
                        ) : ringStatus.status === 'closed-today' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Studied Today ✓</span>
                          </>
                        ) : (
                          <>
                            <Flame className="w-3.5 h-3.5" />
                            <span>Log Study Session</span>
                          </>
                        )}
                      </Button>
                    )}

                    <a
                      href={`/topics/${topic._id}`}
                      className="inline-flex items-center h-9 px-3 text-xs rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 gap-1.5 transition-colors font-medium"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Read Note</span>
                    </a>

                    {/* Cadence selector */}
                    {isOwner && (
                      <select
                        aria-label="Study Cadence"
                        value={topic.ring?.frequency || 'daily'}
                        onChange={(e) =>
                          handleUpdateFrequency(topic._id, e.target.value as RingFrequency)
                        }
                        className="h-9 px-2.5 text-xs rounded-xl border border-white/10 bg-zinc-900/90 text-zinc-300 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="every-2-days">Every 2 Days</option>
                        <option value="3x-week">3× / Week</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    )}

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFromRing(topic._id, topic.title)}
                        className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove from Ring"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-amber-500/20 bg-amber-950/10 backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10">
            <CircularActivityRing percent={75} status="due-today" size={54} strokeWidth={5} />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white">Your Study Ring is Open</h3>
          <p className="text-sm text-zinc-400 max-w-md mt-2 mb-6 leading-relaxed">
            The Study Ring is for topics you are actively studying right now. Set how often you want to study (daily, every 2 days, weekly) to receive reminders that you are not done yet!
          </p>

          {isOwner && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {eligibleTopics.length > 0 && (
                <Button
                  onClick={() => setAddModalOpen(true)}
                  className="gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-medium shadow-md shadow-amber-600/30 rounded-xl text-sm"
                >
                  <Plus className="w-4 h-4" /> Add Topic from Queue
                </Button>
              )}

              <Button
                variant="outline"
                onClick={onOpenAddModal}
                className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 rounded-xl text-sm"
              >
                <Plus className="w-4 h-4" /> Create New Topic
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add from Queue Dialog */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md border-white/10 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Flame className="w-5 h-5 text-amber-400" />
              <span>Add Task to Habit Rings</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Pick an existing task from your queue and set your weekly or monthly target cadence and theme color.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Select Task:
              </label>
              <select
                value={selectedQueueTopicId}
                onChange={(e) => setSelectedQueueTopicId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-white/10 bg-zinc-900 text-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                <option value="">-- Choose a Task --</option>
                {eligibleTopics.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Color Theme Selector */}
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Theme Color:
              </label>
              <div className="flex items-center gap-2">
                {(Object.keys(RING_COLORS) as RingColor[]).map((cKey) => {
                  const cDef = RING_COLORS[cKey];
                  const isSel = selectedColor === cKey;
                  return (
                    <button
                      key={cKey}
                      type="button"
                      onClick={() => setSelectedColor(cKey)}
                      className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${
                        isSel ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: cDef.hex }}
                      title={cDef.name}
                    >
                      {isSel && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Target Frequency / Cadence:
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {[
                  { id: '4x-week', label: '4 Days / Week', desc: 'At least 4 days (e.g. Gym)' },
                  { id: 'daily', label: 'Daily (7 Days)', desc: 'Every day focus' },
                  { id: '3x-week', label: '3 Days / Week', desc: 'Every 2 days' },
                  { id: '2x-week', label: '2 Days / Week', desc: 'Twice a week' },
                  { id: '1x-week', label: '1 Day / Week', desc: 'Once a week' },
                  { id: '5x-week', label: '5 Days / Week', desc: 'Weekdays focus' },
                  { id: '6x-week', label: '6 Days / Week', desc: 'High intensity' },
                  { id: '10x-month', label: '10 Days / Month', desc: 'Monthly baseline' },
                  { id: '15x-month', label: '15 Days / Month', desc: 'Every other day in month' },
                  { id: '20x-month', label: '20 Days / Month', desc: '20 days per month' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedFrequency(item.id as RingFrequency)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      selectedFrequency === item.id
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-white ring-1 ring-emerald-500/40'
                        : 'border-white/5 bg-zinc-900/60 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
                    }`}
                  >
                    <p className="font-semibold text-xs text-zinc-200">{item.label}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddExistingToRing}
                disabled={!selectedQueueTopicId || addingToRing}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl gap-1.5"
              >
                {addingToRing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Habit Rings</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
