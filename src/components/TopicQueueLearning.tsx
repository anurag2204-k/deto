'use client';

import { useState, useEffect, useMemo } from 'react';
import { TopicQueueItem } from '@/lib/types';
import { updateTopicQueue } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  CheckCircle2,
  Circle,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Brain,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  ListTodo,
  Copy,
} from 'lucide-react';

interface TopicQueueLearningProps {
  topicId: string;
  topicTitle: string;
  notes?: string;
  initialQueueItems?: TopicQueueItem[];
  isOwner: boolean;
  onQueueUpdated?: (items: TopicQueueItem[]) => void;
}

/**
 * Parses markdown links [label](url) and bare URLs into clean, clickable badge pills
 * without exposing raw URL strings.
 */
function renderCleanItemText(text: string): React.ReactNode {
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+|www\.[^\s\)]+)\)|(https?:\/\/[^\s]+|www\.[^\s]+)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      // Markdown link [label](url)
      const rawLabel = match[1].trim();
      const rawUrl = match[2].trim();
      const href = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

      let displayLabel = rawLabel;
      if (/^(https?:\/\/|www\.)/i.test(displayLabel)) {
        try {
          const u = new URL(href);
          displayLabel = u.hostname.replace(/^www\./, '');
        } catch {
          displayLabel = 'Link';
        }
      }

      const isYouTube = /youtube\.com|youtu\.be/i.test(href);
      const isNotion = /notion\.(so|site|com)/i.test(href);

      elements.push(
        <a
          key={match.index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 transition-colors shadow-xs align-baseline"
        >
          {isYouTube ? (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" />
          ) : isNotion ? (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700 dark:bg-slate-300 inline-block shrink-0" />
          ) : (
            <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
          )}
          <span>{displayLabel}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60 inline shrink-0" />
        </a>
      );
    } else if (match[3]) {
      // Bare URL
      const rawUrl = match[3].trim();
      const href = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
      let domain = rawUrl;
      try {
        const u = new URL(href);
        domain = u.hostname.replace(/^www\./, '');
      } catch {
        domain = 'Link';
      }

      const isYouTube = /youtube\.com|youtu\.be/i.test(href);
      const isNotion = /notion\.(so|site|com)/i.test(href);
      const label = isYouTube ? 'YouTube' : isNotion ? 'Notion' : domain;

      elements.push(
        <a
          key={match.index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 transition-colors shadow-xs align-baseline"
        >
          {isYouTube ? (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" />
          ) : isNotion ? (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700 dark:bg-slate-300 inline-block shrink-0" />
          ) : (
            <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
          )}
          <span>{label}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60 inline shrink-0" />
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements.length > 0 ? elements : text;
}

export function TopicQueueLearning({
  topicId,
  topicTitle,
  notes = '',
  initialQueueItems = [],
  isOwner,
  onQueueUpdated,
}: TopicQueueLearningProps) {
  const [items, setItems] = useState<TopicQueueItem[]>(initialQueueItems);
  const [newText, setNewText] = useState('');
  const [expandedReasoningIds, setExpandedReasoningIds] = useState<Set<string>>(new Set());
  const [reasoningDrafts, setReasoningDrafts] = useState<Record<string, string>>({});
  const [showCompleted, setShowCompleted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialQueueItems);
  }, [initialQueueItems]);

  const activeItems = useMemo(() => {
    return items
      .filter((i) => !i.completed)
      .sort((a, b) => a.order - b.order);
  }, [items]);

  const completedItems = useMemo(() => {
    return items
      .filter((i) => i.completed)
      .sort((a, b) => b.order - a.order);
  }, [items]);

  const currentFocus = activeItems[0] || null;
  const upcomingItems = activeItems.slice(1);

  // Count unimported bullet items from notes
  const importableNotesCount = useMemo(() => {
    if (!notes.trim()) return 0;
    const existingTexts = new Set(items.map((i) => i.text.toLowerCase().trim()));
    const lines = notes.split('\n');
    let count = 0;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      const match = /^[-*•]\s+(.+)$/.exec(line) || /^\d+\.\s+(.+)$/.exec(line);
      if (match) {
        const text = match[1].trim();
        if (text && !existingTexts.has(text.toLowerCase())) {
          count++;
        }
      }
    }
    return count;
  }, [notes, items]);

  const saveQueueState = async (newItems: TopicQueueItem[]) => {
    setItems(newItems);
    onQueueUpdated?.(newItems);
    if (!isOwner) return;

    try {
      await updateTopicQueue(topicId, newItems);
    } catch {
      // Background sync
    }
  };

  // Mark item as completed (tick)
  const handleToggleComplete = async (itemId: string) => {
    const target = items.find((i) => i.id === itemId);
    if (!target) return;

    const willBeCompleted = !target.completed;
    const today = new Date().toISOString().split('T')[0];

    const updated = items.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          completed: willBeCompleted,
          reviewCount: willBeCompleted ? (it.reviewCount || 0) + 1 : it.reviewCount,
          lastReviewedAt: willBeCompleted ? today : it.lastReviewedAt,
        };
      }
      return it;
    });

    const newActives = updated.filter((i) => !i.completed).sort((a, b) => a.order - b.order);
    const reorderedActives = newActives.map((it, idx) => ({ ...it, order: idx + 1 }));
    const finalItems = [...reorderedActives, ...updated.filter((i) => i.completed)];

    await saveQueueState(finalItems);
  };

  // Promote an item directly to #1
  const handlePromoteToFocus = async (itemId: string) => {
    const target = activeItems.find((i) => i.id === itemId);
    if (!target) return;

    const remaining = activeItems.filter((i) => i.id !== itemId);
    const promotedList = [target, ...remaining].map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    await saveQueueState([...promotedList, ...completedItems]);
  };

  // Move item up or down
  const handleMove = async (indexInActive: number, direction: 'up' | 'down') => {
    if (direction === 'up' && indexInActive <= 0) return;
    if (direction === 'down' && indexInActive >= activeItems.length - 1) return;

    const targetIndex = direction === 'up' ? indexInActive - 1 : indexInActive + 1;
    const copy = [...activeItems];
    const temp = copy[indexInActive];
    copy[indexInActive] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reordered = copy.map((it, idx) => ({ ...it, order: idx + 1 }));
    await saveQueueState([...reordered, ...completedItems]);
  };

  // Quick Add new item
  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newText.trim();
    if (!text) return;

    const newItem: TopicQueueItem = {
      id: `qitem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text,
      order: activeItems.length + 1,
      completed: false,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    };

    const updated = [...activeItems, newItem, ...completedItems];
    setNewText('');
    await saveQueueState(updated);
  };

  // Import bullet points from notes
  const handleImportFromNotes = async () => {
    if (!notes.trim()) return;

    const existingTexts = new Set(items.map((i) => i.text.toLowerCase().trim()));
    const lines = notes.split('\n');
    const importedItems: TopicQueueItem[] = [];
    let nextOrder = activeItems.length + 1;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const match = /^[-*•]\s+(.+)$/.exec(line) || /^\d+\.\s+(.+)$/.exec(line);
      if (match) {
        const text = match[1].trim();
        if (text && !existingTexts.has(text.toLowerCase())) {
          existingTexts.add(text.toLowerCase());
          importedItems.push({
            id: `qitem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            text,
            order: nextOrder++,
            completed: false,
            reviewCount: 0,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    if (importedItems.length === 0) return;

    const updated = [...activeItems, ...importedItems, ...completedItems];
    await saveQueueState(updated);
  };

  // Delete an item
  const handleDeleteItem = async (itemId: string) => {
    const target = items.find((i) => i.id === itemId);
    if (!target) return;
    if (confirm(`Remove "${target.text}"?`)) {
      const remaining = items.filter((i) => i.id !== itemId);
      const remainingActives = remaining.filter((i) => !i.completed).map((it, idx) => ({ ...it, order: idx + 1 }));
      await saveQueueState([...remainingActives, ...remaining.filter((i) => i.completed)]);
    }
  };

  // Toggle reasoning view
  const toggleReasoning = (itemId: string, initialText?: string) => {
    setExpandedReasoningIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
        if (initialText !== undefined && reasoningDrafts[itemId] === undefined) {
          setReasoningDrafts((d) => ({ ...d, [itemId]: initialText || '' }));
        }
      }
      return next;
    });
  };

  // Save reasoning
  const handleSaveReasoning = async (itemId: string) => {
    const draft = reasoningDrafts[itemId] ?? '';
    const updated = items.map((it) => {
      if (it.id === itemId) {
        return { ...it, reasoning: draft.trim() ? draft.trim() : undefined };
      }
      return it;
    });
    await saveQueueState(updated);
  };

  const copyReasoning = (itemId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(itemId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Quick Add Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-950/60 shadow-xs">
        <form onSubmit={handleQuickAdd} className="flex-1 flex items-center gap-2">
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickAdd();
              }
            }}
            placeholder="Add to-do or learning point... (Press Enter)"
            className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 rounded-lg focus:border-indigo-500 h-9"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newText.trim() || !isOwner}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shrink-0 gap-1 h-9 px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </Button>
        </form>

        {importableNotesCount > 0 && isOwner && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleImportFromNotes}
            className="text-xs border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-lg shrink-0 gap-1.5 h-9"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Import {importableNotesCount} from Notes</span>
          </Button>
        )}
      </div>

      {/* CURRENT FOCUS CARD (#1 in Queue) */}
      {currentFocus ? (
        <div className="rounded-2xl border border-indigo-500/40 dark:border-indigo-500/30 bg-white dark:bg-zinc-950 p-5 shadow-lg shadow-indigo-500/5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
              <Badge className="bg-indigo-600 text-white border-none text-[11px] font-semibold px-2 py-0.5">
                Current Focus
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleReasoning(currentFocus.id, currentFocus.reasoning)}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
              >
                <Brain className="w-3.5 h-3.5 text-indigo-500" />
                <span>{expandedReasoningIds.has(currentFocus.id) ? 'Hide Note' : currentFocus.reasoning ? 'View Note' : 'Add Note'}</span>
              </button>

              {isOwner && (
                <Button
                  size="sm"
                  onClick={() => handleToggleComplete(currentFocus.id)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg px-3 py-1 text-xs gap-1.5 h-8 shadow-xs"
                  title="Mark done and bring next topic to focus"
                >
                  <Check className="w-4 h-4" />
                  <span>Done</span>
                </Button>
              )}
            </div>
          </div>

          {/* Current Focus Title with Clean Links */}
          <div className="py-1">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
              {renderCleanItemText(currentFocus.text)}
            </h2>
          </div>

          {/* Reasoning / Takeaways Drawer */}
          {expandedReasoningIds.has(currentFocus.id) && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 font-medium">
                <span>Reasoning &amp; Takeaways</span>
                {currentFocus.reasoning && (
                  <button
                    type="button"
                    onClick={() => copyReasoning(currentFocus.id, currentFocus.reasoning!)}
                    className="text-[11px] hover:text-indigo-600 dark:hover:text-white flex items-center gap-1"
                  >
                    {copiedId === currentFocus.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === currentFocus.id ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              {isOwner ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={reasoningDrafts[currentFocus.id] ?? currentFocus.reasoning ?? ''}
                    onChange={(e) =>
                      setReasoningDrafts((d) => ({ ...d, [currentFocus.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveReasoning(currentFocus.id);
                      }
                    }}
                    placeholder="Add notes, takeaway points, or summary... (Ctrl+Enter to save)"
                    className="w-full p-2.5 text-xs sm:text-sm rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 font-mono leading-relaxed focus:outline-hidden focus:border-indigo-500"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleSaveReasoning(currentFocus.id)}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg h-7 px-3"
                    >
                      Save (Ctrl+Enter)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-700 dark:text-zinc-300 font-mono whitespace-pre-wrap">
                  {currentFocus.reasoning || 'No notes added.'}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-white/40 dark:bg-zinc-950/40">
          <ListTodo className="w-6 h-6 text-slate-400 dark:text-zinc-500 mb-2" />
          <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">Queue is empty</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
            Add items above or import bullet points from your note.
          </p>
        </div>
      )}

      {/* UPCOMING ITEMS LIST */}
      {upcomingItems.length > 0 && (
        <div className="space-y-2">
          {upcomingItems.map((item, idx) => {
            const activeIndex = idx + 1;
            const isReasoningOpen = expandedReasoningIds.has(item.id);

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-950/70 p-3 sm:p-3.5 shadow-xs hover:border-slate-300 dark:hover:border-white/20 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Rank */}
                    <span className="flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 dark:bg-zinc-900 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 shrink-0">
                      {activeIndex + 1}
                    </span>

                    {/* Tick checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(item.id)}
                      className="text-slate-400 hover:text-emerald-500 dark:text-zinc-500 dark:hover:text-emerald-400 shrink-0"
                      title="Mark as done"
                    >
                      <Circle className="w-4 h-4" />
                    </button>

                    {/* Text with Clean Links */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-zinc-200 leading-snug">
                        {renderCleanItemText(item.text)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleReasoning(item.id, item.reasoning)}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        item.reasoning
                          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                          : 'text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300'
                      }`}
                      title="Notes & Takeaways"
                    >
                      <Brain className="w-3.5 h-3.5" />
                    </button>

                    {isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={() => handlePromoteToFocus(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 dark:text-zinc-500 dark:hover:text-amber-400 text-xs transition-colors"
                          title="Make Focus"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMove(activeIndex, 'up')}
                          disabled={activeIndex <= 1}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-300 disabled:opacity-20"
                          title="Move up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMove(activeIndex, 'down')}
                          disabled={activeIndex >= activeItems.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-300 disabled:opacity-20"
                          title="Move down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Reasoning Drawer */}
                {isReasoningOpen && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                    {isOwner ? (
                      <div className="space-y-1.5">
                        <textarea
                          rows={2}
                          value={reasoningDrafts[item.id] ?? item.reasoning ?? ''}
                          onChange={(e) =>
                            setReasoningDrafts((d) => ({ ...d, [item.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveReasoning(item.id);
                            }
                          }}
                          placeholder="Notes or takeaway... (Ctrl+Enter to save)"
                          className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 font-mono leading-relaxed focus:outline-hidden focus:border-indigo-500"
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleSaveReasoning(item.id)}
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-md h-6 px-2.5"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 dark:text-zinc-400 font-mono">
                        {item.reasoning || 'No notes added.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* COMPLETED SECTION (Collapsible) */}
      {completedItems.length > 0 && (
        <div className="pt-2 border-t border-slate-200/80 dark:border-white/10">
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center justify-between w-full p-2 rounded-lg text-xs font-medium text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Completed ({completedItems.length})</span>
            </div>
            {showCompleted ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showCompleted && (
            <div className="space-y-1 pt-1">
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50/50 dark:bg-zinc-900/30 text-xs text-slate-400 dark:text-zinc-500"
                >
                  <div className="flex items-center gap-2 truncate flex-1">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="line-through truncate">{renderCleanItemText(item.text)}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(item.id)}
                      className="text-[11px] text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Restore
                    </button>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-slate-400 hover:text-red-500 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
