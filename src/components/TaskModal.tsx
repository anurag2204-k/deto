'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Task, LightweightTopic, RingColor, RingFrequency } from '@/lib/types';
import { RING_COLORS } from '@/lib/logic';
import { Check, Plus, Trash2, Link as LinkIcon, ListTodo, Loader2 } from 'lucide-react';

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
  const [todos, setTodos] = useState<Array<{ id: string; text: string; done: boolean }>>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [linkedTopicIds, setLinkedTopicIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    setTodos((prev) => [
      ...prev,
      { id: `todo-${Date.now()}`, text: newTodoText.trim(), done: false },
    ]);
    setNewTodoText('');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90dvh] overflow-y-auto bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl p-4 sm:p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full shadow-md"
              style={{ backgroundColor: selectedColorDef.hex }}
            />
            <span>{task ? 'Edit Task & Schedule' : 'Create New Task'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
            Tasks track ongoing action routines like Gym sessions, habit cadences, and practice. Link your knowledge topics and to-do checklists.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
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
                className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 rounded-xl focus:border-emerald-500"
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
                className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-zinc-300 placeholder:text-slate-400 dark:placeholder:text-zinc-600 rounded-xl focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Theme Color &amp; Calendar Block Color
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
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
                        ? 'border-white text-white ring-1 ring-white/50 scale-105 shadow-md'
                        : 'border-white/5 bg-zinc-900/60 text-zinc-400 hover:border-white/20 hover:text-white'
                    }`}
                    style={isSel ? { backgroundColor: cDef.bgSubtle, borderColor: cDef.border } : {}}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cDef.hex }}
                    />
                    <span>{cDef.name.split(' ')[0]}</span>
                    {isSel && <Check className="w-3 h-3 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Frequency / Cadence */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Target Frequency &amp; Schedule
            </label>
            <p className="text-[11px] text-zinc-400 mb-2">
              When this target is met in a week, the <strong>entire week block lights up</strong> in your task&apos;s theme color!
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: '4x-week', label: '4 Days / Week', desc: 'At least 4 days (Gym)' },
                { id: 'daily', label: 'Daily (7 Days)', desc: 'Every day' },
                { id: '3x-week', label: '3 Days / Week', desc: 'Every 2 days' },
                { id: '2x-week', label: '2 Days / Week', desc: 'Twice a week' },
                { id: '1x-week', label: '1 Day / Week', desc: 'Once a week' },
                { id: '5x-week', label: '5 Days / Week', desc: 'Weekdays' },
                { id: '6x-week', label: '6 Days / Week', desc: 'High intensity' },
                { id: '10x-month', label: '10 Days / Month', desc: 'Monthly baseline' },
                { id: '15x-month', label: '15 Days / Month', desc: '15 days / month' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFrequency(item.id as RingFrequency)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    frequency === item.id
                      ? 'text-white shadow-xs'
                      : 'border-white/5 bg-zinc-900/60 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
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
                  <p className="font-semibold text-xs text-white">{item.label}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* To-Do Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-indigo-400" />
                <span>To-Do Checklist / Routine Steps</span>
              </label>
              <span className="text-[11px] text-zinc-500">
                {todos.length} item{todos.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-1.5 mb-2">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-900/80 border border-white/5 text-xs text-zinc-200"
                >
                  <span className="truncate flex-1">{todo.text}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTodo(todo.id)}
                    className="text-zinc-500 hover:text-red-400 p-1"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
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
                className="bg-zinc-900 border-white/10 text-xs text-white placeholder:text-zinc-600 rounded-xl"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTodo}
                className="shrink-0 text-xs border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </Button>
            </div>
          </div>

          {/* Linked Topics (Notes from Queue) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Linked Topics &amp; Notes</span>
              </label>
              {onCreateNewTopic && (
                <button
                  type="button"
                  onClick={onCreateNewTopic}
                  className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create New Topic Note</span>
                </button>
              )}
            </div>

            {availableTopics.length === 0 ? (
              <p className="text-xs text-zinc-500 italic p-3 rounded-xl border border-white/5 bg-zinc-900/40">
                No topics in queue yet. Create study notes or topic articles to link them here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl border border-white/5 bg-zinc-900/40">
                {availableTopics.map((topic) => {
                  const isLinked = linkedTopicIds.includes(topic._id);
                  return (
                    <button
                      key={topic._id}
                      type="button"
                      onClick={() => toggleLinkedTopic(topic._id)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                        isLinked
                          ? 'bg-indigo-600/30 border border-indigo-500 text-white font-medium shadow-xs'
                          : 'bg-white/5 border border-white/5 text-zinc-400 hover:border-white/10 hover:text-white'
                      }`}
                    >
                      <span>{topic.title}</span>
                      {isLinked && <Check className="w-3 h-3 text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !title.trim()}
              className="text-xs text-white font-medium rounded-xl gap-1.5 px-5 shadow-lg"
              style={{
                backgroundColor: selectedColorDef.hex,
                boxShadow: `0 0 15px ${selectedColorDef.glow}`,
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
