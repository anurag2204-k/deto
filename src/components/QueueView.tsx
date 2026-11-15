'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TopicDetail } from '@/components/TopicDetail';
import { TopicArtwork, TopicCategoryBadge } from '@/components/TopicArtwork';
import { LightweightTopic, Topic } from '@/lib/types';
import { getTopic, queueDone, moveTopic, ApiError } from '@/lib/api';
import {
  Check,
  GripVertical,
  Edit2,
  Calendar,
  Sparkles,
  Link as LinkIcon,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  BookOpen,
  Loader2,
  X,
} from 'lucide-react';

interface QueueViewProps {
  topics: LightweightTopic[];
  isOwner: boolean;
  onTopicsChange: (topics: LightweightTopic[]) => void;
  onEditTopic: (topic: Topic) => void;
  onSelectTopic: (topicId: string) => void;
  onOpenAddModal: () => void;
  onDeleteTopic: (topic: LightweightTopic) => void;
  onUnauthorized: () => void;
  onActivityLogged?: () => void;
}

// Draggable row for remaining topics in queue
function SortableQueueRow({
  topic,
  queueIndex,
  isOwner,
  onSelect,
  onEdit,
  onDelete,
}: {
  topic: LightweightTopic;
  queueIndex: number;
  isOwner: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic._id, disabled: !isOwner });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-white/5 bg-zinc-950/60 hover:bg-zinc-900/80 hover:border-indigo-500/30 transition-all duration-150 shadow-xs cursor-pointer ${
        isDragging ? 'ring-2 ring-indigo-500 z-20 bg-zinc-900' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3 min-w-0 pr-3">
        {isOwner && (
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
            aria-label={`Drag ${topic.title} to reorder`}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        <TopicArtwork title={topic.title} size="sm" />

        <div className="truncate">
          <p className="font-medium text-sm text-zinc-100 truncate group-hover:text-indigo-300 transition-colors">
            {topic.title}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
          <span>{topic.studiedOn}</span>
        </div>

        <Badge
          variant="secondary"
          className="bg-zinc-900/90 text-zinc-400 border border-white/5 text-xs font-normal"
        >
          Queue #{queueIndex}
        </Badge>

        {isOwner && (
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Edit Topic"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors"
              title="Delete Topic"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function QueueView({
  topics,
  isOwner,
  onTopicsChange,
  onEditTopic,
  onSelectTopic,
  onOpenAddModal,
  onDeleteTopic,
  onUnauthorized,
  onActivityLogged,
}: QueueViewProps) {
  const [todayTopicFull, setTodayTopicFull] = useState<Topic | null>(null);
  const [loadingTodayTopic, setLoadingTodayTopic] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCycling, setIsCycling] = useState(false);
  const [justCycled, setJustCycled] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [cycleNotice, setCycleNotice] = useState<{
    title: string;
    message: string;
    isSingle: boolean;
  } | null>(null);

  const topTopicSummary = topics[0] ?? null;
  const remainingTopics = topics.slice(1);
  const topTopicId = topTopicSummary?._id;

  // Fetch full details of today's topic whenever top topic changes
  useEffect(() => {
    let isCancelled = false;
    if (topTopicId) {
      setLoadingTodayTopic(true);
      getTopic(topTopicId)
        .then((full) => {
          if (!isCancelled) {
            setTodayTopicFull(full);
            setActionError(null);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setActionError('Could not load details for today\'s topic');
          }
        })
        .finally(() => {
          if (!isCancelled) setLoadingTodayTopic(false);
        });
    } else {
      setTodayTopicFull(null);
    }
    return () => {
      isCancelled = true;
    };
  }, [topTopicId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = topics.findIndex((t) => t._id === active.id);
    const newIndex = topics.findIndex((t) => t._id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic UI update
    const previousTopics = [...topics];
    const reordered = arrayMove(topics, oldIndex, newIndex);
    onTopicsChange(reordered);

    const prevId = newIndex > 0 ? reordered[newIndex - 1]._id : null;
    const nextId = newIndex < reordered.length - 1 ? reordered[newIndex + 1]._id : null;

    try {
      await moveTopic(String(active.id), prevId, nextId);
    } catch (err) {
      onTopicsChange(previousTopics);
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
      } else {
        setActionError('Failed to reorder topics. Restored previous order.');
      }
    }
  };

  const handleQueueDone = async () => {
    if (!topTopicSummary || isCycling) return;

    setIsCycling(true);
    setActionError(null);
    const moved = topTopicSummary;
    const isSingle = topics.length <= 1;
    const nextTopic = topics[1] ?? null;

    // Optimistic UI update
    const previousTopics = [...topics];
    const optimisticList = isSingle
      ? [...previousTopics]
      : [...previousTopics.slice(1), moved];
    onTopicsChange(optimisticList);
    setAnimKey((k) => k + 1);

    try {
      await queueDone(moved._id);
      setJustCycled(true);
      onActivityLogged?.();

      if (isSingle) {
        setCycleNotice({
          title: `"${moved.title}" Completed & Cycled!`,
          message: `In a FIFO queue, completing a topic sends it to the bottom. Since this is your only topic in rotation, it cycled back to #1. Add a second topic below to watch them alternate positions!`,
          isSingle: true,
        });
      } else {
        setCycleNotice({
          title: `"${moved.title}" Cycled to Bottom!`,
          message: `Moved down to Queue #${topics.length} at the bottom of the list. "${nextTopic?.title}" is now Today's Topic!`,
          isSingle: false,
        });
      }

      setTimeout(() => {
        setJustCycled(false);
      }, 2500);
    } catch (err) {
      onTopicsChange(previousTopics);
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
      } else {
        setActionError('Failed to mark topic as done. Please try again.');
      }
    } finally {
      setIsCycling(false);
    }
  };

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-white/10 bg-zinc-950/40 backdrop-blur-md shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/10">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold tracking-tight text-white">Your Task Queue is Empty</h3>
        <p className="text-sm text-zinc-400 max-w-sm mt-2 mb-6">
          Add tasks to start your daily FIFO rotation and habit tracking cycle.
        </p>
        {isOwner && (
          <Button
            onClick={onOpenAddModal}
            className="gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium shadow-md shadow-indigo-600/30 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Add Your First Task
          </Button>
        )}
      </div>
    );
  }

  // First sentence / clean snippet of notes
  const notesSnippet = todayTopicFull?.notes
    ? todayTopicFull.notes.replace(/^[#*-]\s+/gm, '').split('\n')[0]
    : 'No descriptive notes added yet.';

  return (
    <div className="space-y-10">
      {actionError && (
        <div className="p-3 text-sm text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">
          {actionError}
        </div>
      )}

      {/* TOP SECTION: Today's Topic (Featured Glow Card) */}
      <section className="space-y-4">
        {/* Cycle Notice Toast Banner */}
        {cycleNotice && (
          <div
            role="status"
            className="p-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-zinc-950/90 to-zinc-950/90 backdrop-blur-md text-xs text-indigo-200 flex items-start gap-3.5 shadow-xl shadow-indigo-950/40 animate-in fade-in slide-in-from-top-3 duration-200"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <p className="font-semibold text-sm text-white flex items-center gap-2">
                <span>{cycleNotice.title}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Cycled ✓
                </span>
              </p>
              <p className="mt-1 leading-relaxed text-zinc-300">{cycleNotice.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setCycleNotice(null)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div
          key={animKey}
          className={`relative group rounded-2xl border ${
            justCycled
              ? 'border-emerald-500/60 shadow-[0_0_35px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/40'
              : 'border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.15)]'
          } bg-gradient-to-r from-indigo-950/40 via-zinc-950/80 to-zinc-950/90 p-5 sm:p-6 backdrop-blur-xl transition-all duration-300 overflow-hidden`}
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 flex-1 min-w-0 w-full">
              {/* Dynamic Topic Artwork */}
              <TopicArtwork
                title={topTopicSummary.title}
                notes={todayTopicFull?.notes}
                imageUrl={
                  todayTopicFull?.files?.find((f) => f.type.startsWith('image/'))
                    ? `/api/files/${todayTopicFull.files.find((f) => f.type.startsWith('image/'))?.fileId}`
                    : undefined
                }
                size="hero"
              />

              {/* Main Content */}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    Today&apos;s Focus Task
                  </span>

                  <TopicCategoryBadge
                    title={topTopicSummary.title}
                    notes={todayTopicFull?.notes}
                  />

                  <span className="text-xs text-zinc-500 shrink-0">
                    Queue #1 • Stage {topTopicSummary.revision.stage}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight break-words">
                  {topTopicSummary.title}
                </h2>

                <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 max-w-2xl leading-relaxed break-words">
                  {notesSnippet}
                </p>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-zinc-400">
                  <span className="inline-flex items-center gap-1 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    Date: {topTopicSummary.studiedOn}
                  </span>

                  {todayTopicFull?.links && todayTopicFull.links.length > 0 && (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                      {todayTopicFull.links.length} {todayTopicFull.links.length === 1 ? 'Link' : 'Links'}
                    </span>
                  )}

                  {todayTopicFull?.files && todayTopicFull.files.length > 0 && (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                      {todayTopicFull.files.length} {todayTopicFull.files.length === 1 ? 'File' : 'Files'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Action buttons - Responsive layout so preview & edit never go out of the window */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between sm:justify-start gap-3 w-full lg:w-auto shrink-0 border-t border-white/5 lg:border-t-0 pt-4 lg:pt-0">
              {isOwner && (
                <Button
                  onClick={handleQueueDone}
                  disabled={isCycling}
                  className={`w-full sm:w-auto h-10 px-5 text-white font-medium shadow-lg rounded-xl gap-2 text-sm transition-all duration-200 shrink-0 ${
                    justCycled
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-600/30'
                  }`}
                >
                  {isCycling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Cycling...</span>
                    </>
                  ) : justCycled ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Cycled to Bottom ✓</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Mark as Done</span>
                    </>
                  )}
                </Button>
              )}

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                <a
                  href={`/topics/${topTopicSummary._id}`}
                  className="inline-flex items-center h-8 px-3 text-xs rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 gap-1.5 transition-colors font-medium shrink-0"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Read Note Page</span>
                </a>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedDetails(!expandedDetails)}
                    className="h-8 text-xs text-zinc-400 hover:text-white hover:bg-white/5 gap-1 px-2.5"
                  >
                    {expandedDetails ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" /> Inline
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" /> Preview
                      </>
                    )}
                  </Button>

                  {todayTopicFull && isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditTopic(todayTopicFull)}
                      className="h-8 text-xs text-zinc-400 hover:text-white hover:bg-white/5 gap-1 px-2.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Full Notes Preview inside Today's Card */}
          {expandedDetails && (
            <div className="mt-6 pt-6 border-t border-white/10">
              {loadingTodayTopic && !todayTopicFull ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  Loading notes...
                </div>
              ) : todayTopicFull ? (
                <TopicDetail topic={todayTopicFull} />
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* BELOW: The Remaining Study Queue */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
              Your Task Queue
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Drag to reorder. Complete today&apos;s task to move it to the bottom.
            </p>
          </div>

          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAddModal}
              className="h-8 text-xs border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 gap-1.5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Add Task</span>
            </Button>
          )}
        </div>

        {remainingTopics.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={topics.map((t) => t._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {remainingTopics.map((topic, index) => (
                  <SortableQueueRow
                    key={topic._id}
                    topic={topic}
                    queueIndex={index + 2}
                    isOwner={isOwner}
                    onSelect={() => onSelectTopic(topic._id)}
                    onEdit={() => onSelectTopic(topic._id)}
                    onDelete={() => onDeleteTopic(topic)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="p-6 sm:p-8 text-center rounded-2xl border border-dashed border-indigo-500/20 bg-indigo-950/10 backdrop-blur-sm">
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-200">1 Topic in Queue Rotation</h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 mb-4 leading-relaxed">
              In a FIFO queue, completing Today&apos;s Topic cycles it to the bottom. Because you currently have 1 topic in your study tracker, it cycles right back to #1! Add a 2nd topic to watch them rotate positions each day.
            </p>
            {isOwner && (
              <Button
                onClick={onOpenAddModal}
                variant="outline"
                size="sm"
                className="text-xs border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 gap-1.5 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Next Topic to Queue</span>
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
