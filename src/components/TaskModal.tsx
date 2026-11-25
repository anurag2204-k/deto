'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Task, LightweightTopic, RingColor, RingFrequency } from '@/lib/types';
import { RING_COLORS } from '@/lib/logic';
import { Check, Plus, Trash2, Link as LinkIcon, ListTodo, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  availableTopics: LightweightTopic[];
  onSave: (data: {
    title: string;
    description?: string;
    color: RingColor;
    frequency: RingFrequency;
    targetDays?: number;
    targetPeriod?: 'week' | 'month';
    todos: Array<{ id?: string; text: string; done?: boolean }>;
    linkedTopicIds: string[];
  }) => Promise<void>;
  onCreateNewTopic?: () => void;
}

const FREQUENCY_OPTIONS = [
  { id: '4x-week', label: '4 Days / Week', desc: 'At least 4 days (Gym)' },
  { id: 'daily', label: 'Daily (7 Days)', desc: 'Every day' },
  { id: '3x-week', label: '3 Days / Week', desc: 'Every 2 days' },
  { id: '2x-week', label: '2 Days / Week', desc: 'Twice a week' },
  { id: '1x-week', label: '1 Day / Week', desc: 'Once a week' },
  { id: '5x-week', label: '5 Days / Week', desc: 'Weekdays' },
  { id: '6x-week', label: '6 Days / Week', desc: 'High intensity' },
  { id: '10x-month', label: '10 Days / Month', desc: 'Monthly baseline' },
  { id: '15x-month', label: '15 Days / Month', desc: '15 days / month' },
] as const;

export function TaskModal({
  open,
  onOpenChange,
  task,
  availableTopics,
  onSave,
  onCreateNewTopic,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<RingColor>('emerald');
  const [frequency, setFrequency] = useState<RingFrequency>('4x-week');
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);
  const [todos, setTodos] = useState<Array<{ id: string; text: string; done: boolean }>>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [linkedTopicIds, setLinkedTopicIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShowScheduleSettings(false);
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setColor(task.color || 'emerald');
      setFrequency(task.schedule?.frequency || '4x-week');
      setTodos(task.todos || []);
      setLinkedTopicIds(task.linkedTopicIds || []);
    } else {
      setTitle('');
      setDescription('');
      setColor('emerald');
      setFrequency('4x-week');
      setTodos([
        { id: `todo-${Date.now()}-1`, text: 'Main workout session', done: false },
        { id: `todo-${Date.now()}-2`, text: 'Post-workout stretch', done: false },
      ]);
      setLinkedTopicIds([]);
    }
    setError(null);
  }, [task, open]);

  const handleAddTodo = () => {
    if (!newTodoText.trim()) return;
    setTodos((prev) => {
      const newTodo = { id: `todo-${Date.now()}`, text: newTodoText.trim(), done: false };
      const undone = prev.filter((t) => !t.done);
      const done = prev.filter((t) => t.done);
      return [...undone, newTodo, ...done];
    });
    setNewTodoText('');
  };

  const handleToggleTodoInModal = (id: string) => {
    setTodos((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      const undone = updated.filter((t) => !t.done);
      const done = updated.filter((t) => t.done);
      return [...undone, ...done];
    });
  };

  const handleRemoveTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleLinkedTopic = (topicId: string) => {
    setLinkedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        color,
        frequency,
        todos,
        linkedTopicIds,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const selectedColorDef = RING_COLORS[color] || RING_COLORS.emerald;
  const currentFreqItem = FREQUENCY_OPTIONS.find((f) => f.id === frequency);
  const currentFreqLabel = currentFreqItem ? currentFreqItem.label : frequency;

  const undoneTodos = todos.filter((t) => !t.done);
  const doneTodos = todos.filter((t) => t.done);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[85vh] sm:max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-[#0f111a] border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white rounded-3xl shadow-2xl">
        {/* Fixed Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200/80 dark:border-white/10 shrink-0 bg-white dark:bg-[#0f111a] pr-12">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full shadow-md shrink-0"
                style={{ backgroundColor: selectedColorDef.hex }}
              />
              <span>{task ? 'Edit Task & Schedule' : 'Create New Task'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Configure your habit routine, target cadence, checklist, and linked topic notes.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4 min-w-0">
            {error && (
              <div className="p-3 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
                {error}
              </div>
            )}

            {/* Title & Description */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1.5">
                  Task Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Gym Workout, 5km Run, System Design Practice, LeetCode"
                  className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 rounded-xl focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1.5">
                  Description / Motivation (Optional)
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Strength building 4x per week + progressive overload"
                  className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-zinc-300 placeholder:text-slate-400 dark:placeholder:text-zinc-600 rounded-xl focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Collapsible Cadence & Theme Color Settings */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-900/40 overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setShowScheduleSettings((prev) => !prev)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 text-left hover:bg-slate-100/70 dark:hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs ring-2 ring-white dark:ring-zinc-900"
                    style={{ backgroundColor: selectedColorDef.hex }}
                  />
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                      Cadence &amp; Color:
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-medium">
                      {currentFreqLabel}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                      • {selectedColorDef.name.split(' ')[0]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                    {showScheduleSettings ? 'Hide' : 'Change'}
                  </span>
                  {showScheduleSettings ? (
                    <ChevronUp className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                  )}
                </div>
              </button>

              {showScheduleSettings && (
                <div className="px-3.5 pb-4 sm:px-4 sm:pb-4 pt-3 border-t border-slate-200/70 dark:border-white/5 space-y-4">
                  {/* Color Selection */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1.5">
                      Theme Color &amp; Calendar Block Color
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {(Object.keys(RING_COLORS) as RingColor[]).map((cKey) => {
                        const cDef = RING_COLORS[cKey];
                        const isSel = color === cKey;
                        return (
                          <button
                            key={cKey}
                            type="button"
                            onClick={() => setColor(cKey)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                              isSel
                                ? 'border-indigo-500 text-slate-900 dark:text-white ring-2 ring-indigo-500/30 scale-105 shadow-xs'
                                : 'border-slate-200/80 dark:border-white/5 bg-slate-100/60 dark:bg-zinc-900/60 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            style={isSel ? { backgroundColor: cDef.bgSubtle, borderColor: cDef.border } : {}}
                          >
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: cDef.hex }}
                            />
                            <span>{cDef.name.split(' ')[0]}</span>
                            {isSel && <Check className="w-3 h-3 text-indigo-600 dark:text-white shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target Frequency / Cadence */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                      Target Frequency &amp; Schedule
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mb-2">
                      When this target is met in a week, the <strong>entire week block lights up</strong> in your task&apos;s theme color!
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {FREQUENCY_OPTIONS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFrequency(item.id as RingFrequency)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            frequency === item.id
                              ? 'text-slate-900 dark:text-white shadow-xs ring-1 ring-indigo-500/30'
                              : 'border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-zinc-900/60 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-white/10 hover:text-slate-900 dark:hover:text-zinc-200'
                          }`}
                          style={
                            frequency === item.id
                              ? {
                                  backgroundColor: selectedColorDef.bgSubtle,
                                  borderColor: selectedColorDef.border,
                                }
                              : {}
                          }
                        >
                          <p className="font-semibold text-xs text-slate-900 dark:text-white">{item.label}</p>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">{item.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* To-Do Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Routine Checklist ({doneTodos.length}/{todos.length} completed)</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Undone items on top, completed at bottom
                </span>
              </div>

              {todos.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-zinc-500 italic p-3 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-zinc-900/40">
                  No routine items yet. Add checklist steps below.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {/* Undone Items */}
                  {undoneTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-start justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/5 text-xs text-slate-800 dark:text-zinc-200 min-w-0"
                    >
                      <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={() => handleToggleTodoInModal(todo.id)}
                        className="w-3.5 h-3.5 rounded bg-white dark:bg-zinc-900 border-slate-300 dark:border-white/20 text-indigo-600 dark:text-indigo-500 focus:ring-0 cursor-pointer mt-0.5 shrink-0"
                        title="Mark done / move down"
                      />
                      <span className="flex-1 min-w-0 break-words leading-relaxed select-text">
                        {todo.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTodo(todo.id)}
                        className="text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 p-1 shrink-0 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Divider if both exist */}
                  {doneTodos.length > 0 && undoneTodos.length > 0 && (
                    <div className="pt-2 pb-1 border-t border-slate-200/80 dark:border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      <span>Completed ({doneTodos.length})</span>
                    </div>
                  )}

                  {/* Done Items */}
                  {doneTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-start justify-between gap-2.5 p-2.5 rounded-xl bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 text-xs text-slate-400 dark:text-zinc-500 min-w-0"
                    >
                      <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={() => handleToggleTodoInModal(todo.id)}
                        className="w-3.5 h-3.5 rounded bg-white dark:bg-zinc-900 border-slate-300 dark:border-white/20 text-indigo-600 dark:text-indigo-500 focus:ring-0 cursor-pointer mt-0.5 shrink-0 opacity-70"
                        title="Mark incomplete / move up"
                      />
                      <span className="flex-1 min-w-0 break-words leading-relaxed select-text line-through">
                        {todo.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTodo(todo.id)}
                        className="text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 p-1 shrink-0 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Todo Input Row */}
              <div className="flex items-center gap-2 pt-1">
                <Input
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTodo();
                    }
                  }}
                  placeholder="Add checklist item (e.g. Bench press 4x8, 20m cardio)..."
                  className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 rounded-xl flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTodo}
                  disabled={!newTodoText.trim()}
                  className="shrink-0 text-xs border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </Button>
              </div>
            </div>

            {/* Linked Topics (Notes from Queue) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>Linked Topics &amp; Notes</span>
                </label>
                {onCreateNewTopic && (
                  <button
                    type="button"
                    onClick={onCreateNewTopic}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create New Topic Note</span>
                  </button>
                )}
              </div>

              {availableTopics.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-zinc-500 italic p-3 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-zinc-900/40">
                  No topics in queue yet. Create study notes or topic articles to link them here.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50/60 dark:bg-zinc-900/40">
                  {availableTopics.map((topic) => {
                    const isLinked = linkedTopicIds.includes(topic._id);
                    return (
                      <button
                        key={topic._id}
                        type="button"
                        onClick={() => toggleLinkedTopic(topic._id)}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                          isLinked
                            ? 'bg-indigo-600/15 border border-indigo-500 text-indigo-800 dark:text-indigo-200 font-medium shadow-2xs'
                            : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-white/10 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>{topic.title}</span>
                        {isLinked && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Fixed Sticky Footer */}
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/90 dark:bg-zinc-900/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 dark:text-zinc-400 truncate">
              {todos.length} checklist item{todos.length === 1 ? '' : 's'}
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs border-slate-200 dark:border-white/10 bg-white hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || !title.trim()}
                className="text-xs text-white font-medium rounded-xl gap-1.5 px-4 shadow-md"
                style={{
                  backgroundColor: selectedColorDef.hex,
                  boxShadow: `0 0 12px ${selectedColorDef.glow}`,
                }}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{task ? 'Update Task' : 'Create Task'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
