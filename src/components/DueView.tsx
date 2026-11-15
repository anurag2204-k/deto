'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TopicDetail } from '@/components/TopicDetail';
import { LightweightTopic, Topic } from '@/lib/types';
import { formatOverdueLabel } from '@/lib/logic';
import { getTopic, revisionDone, ApiError } from '@/lib/api';
import { TopicArtwork, TopicCategoryBadge } from '@/components/TopicArtwork';
import { CheckCircle2, ChevronDown, ChevronRight, Calendar } from 'lucide-react';

interface DueViewProps {
  topics: LightweightTopic[];
  today: string;
  isOwner: boolean;
  onTopicRevisionDone: (updatedTopicId: string) => void;
  onUnauthorized: () => void;
}

export function DueView({
  topics,
  today,
  isOwner,
  onTopicRevisionDone,
  onUnauthorized,
}: DueViewProps) {
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [topicDetails, setTopicDetails] = useState<Record<string, Topic>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleExpand = async (id: string) => {
    if (expandedTopicId === id) {
      setExpandedTopicId(null);
      return;
    }

    setExpandedTopicId(id);
    if (!topicDetails[id]) {
      setLoadingId(id);
      try {
        const full = await getTopic(id);
        setTopicDetails((prev) => ({ ...prev, [id]: full }));
      } catch {
        setError('Failed to load topic details');
      } finally {
        setLoadingId(null);
      }
    }
  };

  const handleRevisionDone = async (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation();
    setError(null);

    onTopicRevisionDone(topicId);

    try {
      await revisionDone(topicId, today);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
      } else {
        setError('Failed to mark revision done. Please refresh.');
      }
    }
  };

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-white/10 bg-zinc-950/40 backdrop-blur-md shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold tracking-tight text-white">All Caught Up!</h3>
        <p className="text-sm text-zinc-400 max-w-sm mt-2">
          Nothing due for revision today. Your spaced repetitions will prompt you automatically according to your 1 → 3 → 7 → 14 → 30 day cycle.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pb-1">
        <div>
          <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
            Due for Spaced Revision ({topics.length})
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Arranged with most overdue topics first.
          </p>
        </div>
        <span className="text-xs text-zinc-500 font-mono">{today}</span>
      </div>

      <div className="space-y-2.5">
        {topics.map((topic) => {
          const isExpanded = expandedTopicId === topic._id;
          const overdueLabel = formatOverdueLabel(topic.revision.nextDueAt, today);
          const isOverdue = overdueLabel.includes('overdue');
          const currentRevisionNumber = topic.revision.stage + 1;

          return (
            <div
              key={topic._id}
              className={`rounded-xl border transition-all duration-150 overflow-hidden bg-zinc-950/70 backdrop-blur-md ${
                isExpanded
                  ? 'border-indigo-500/50 shadow-md shadow-indigo-500/5'
                  : 'border-white/5 hover:border-indigo-500/30'
              }`}
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
                onClick={() => toggleExpand(topic._id)}
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <button
                    type="button"
                    className="text-zinc-500 hover:text-zinc-300 shrink-0"
                    aria-label={isExpanded ? 'Collapse topic' : 'Expand topic'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <TopicArtwork title={topic.title} size="sm" />

                  <div className="truncate">
                    <h4 className="font-medium text-sm text-zinc-100 truncate">
                      {topic.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                      <TopicCategoryBadge title={topic.title} />
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-600" />
                        Studied {topic.studiedOn}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                  <Badge className="bg-zinc-900 border border-white/10 text-zinc-400 text-[11px] sm:text-xs font-normal px-1.5 sm:px-2.5">
                    <span className="hidden sm:inline">Revision </span>#{currentRevisionNumber}
                  </Badge>

                  <Badge
                    variant="outline"
                    className={`text-[11px] sm:text-xs font-normal px-1.5 sm:px-2.5 ${
                      isOverdue
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {overdueLabel}
                  </Badge>

                  {isOwner && (
                    <Button
                      size="sm"
                      className="gap-1 text-xs h-7 px-2 sm:px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm"
                      onClick={(e) => handleRevisionDone(e, topic._id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="p-6 border-t border-white/10 bg-black/40">
                  {loadingId === topic._id ? (
                    <div className="py-6 text-center text-xs text-zinc-500">
                      Loading notes and references...
                    </div>
                  ) : topicDetails[topic._id] ? (
                    <TopicDetail topic={topicDetails[topic._id]} />
                  ) : (
                    <p className="text-xs text-zinc-500">Details unavailable</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
