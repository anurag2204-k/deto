'use client';

import { useState } from 'react';
import { Task, LightweightTopic, RingColor } from '@/lib/types';
import { RING_COLORS, calculateTaskStreak, getRingGoal } from '@/lib/logic';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  Plus,
  Flame,
  Trophy,
  Calendar as CalendarIcon,
  Link as LinkIcon,
  ListTodo,
  Edit2,
  Trash2,
  Sparkles,
  ArrowUpRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ExternalLink,
} from 'lucide-react';

interface TaskListViewProps {
  tasks: Task[];
  topics: LightweightTopic[];
  today: string;
  isOwner: boolean;
  onLogSession: (taskId: string) => Promise<void>;
  onToggleTodo: (taskId: string, todoId: string, done: boolean) => Promise<void>;
  onAddTodo: (taskId: string, text: string) => Promise<void>;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  onOpenCreateTask: () => void;
  onOpenTopic: (topicId: string) => void;
  onSelectTaskInCalendar: (taskId: string) => void;
}

export function TaskListView({
  tasks,
  topics,
  today,
  isOwner,
  onLogSession,
  onToggleTodo,
  onAddTodo,
  onEditTask,
  onDeleteTask,
  onOpenCreateTask,
  onOpenTopic,
  onSelectTaskInCalendar,
}: TaskListViewProps) {
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [inlineTodoText, setInlineTodoText] = useState<Record<string, string>>({});
  const [addingTodoId, setAddingTodoId] = useState<string | null>(null);
  const [expandedTodoIds, setExpandedTodoIds] = useState<Record<string, boolean>>({});
  const [expandedAllTasks, setExpandedAllTasks] = useState<Record<string, boolean>>({});
  const [expandedListTasks, setExpandedListTasks] = useState<Record<string, boolean>>({});

  const toggleTodoExpand = (todoId: string) => {
    setExpandedTodoIds((prev) => ({ ...prev, [todoId]: !prev[todoId] }));
  };

  const toggleTaskExpandAll = (taskId: string) => {
    setExpandedAllTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleListHeightExpand = (taskId: string) => {
    setExpandedListTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const topicMap = new Map(topics.map((t) => [t._id, t]));

  const handleQuickAddTodo = async (taskId: string) => {
    const text = inlineTodoText[taskId]?.trim();
    if (!text) return;
    setAddingTodoId(taskId);
    try {
      await onAddTodo(taskId, text);
      setInlineTodoText((prev) => ({ ...prev, [taskId]: '' }));
    } finally {
      setAddingTodoId(null);
    }
  };

  const handleLog = async (taskId: string) => {
    if (loggingId) return;
    setLoggingId(taskId);
    try {
      await onLogSession(taskId);
    } finally {
      setLoggingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Tasks &amp; Habit Routines</span>
            </h2>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/30 text-xs px-2 py-0.5 font-medium">
              Action Targets
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1 max-w-xl">
            Tasks track ongoing habits (Gym, Coding, Running, etc.) with weekly targets, to-do checklists, and links to your topic notes.
          </p>
        </div>

        {isOwner && (
          <Button
            onClick={onOpenCreateTask}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-600/20 rounded-xl gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Task</span>
          </Button>
        )}
      </div>

      {/* Empty State */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-zinc-950/40 backdrop-blur-md shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">No Tasks Created Yet</h3>
          <p className="text-sm text-slate-600 dark:text-zinc-400 max-w-sm mt-2 mb-6">
            Create tasks like &ldquo;Gym (4 days / week)&rdquo; or &ldquo;LeetCode Practice&rdquo; with checklists, schedules, and topic links.
          </p>
          {isOwner && (
            <Button
              onClick={onOpenCreateTask}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium shadow-md rounded-xl"
            >
              <Plus className="w-4 h-4" /> Create First Task
            </Button>
          )}
        </div>
      ) : (
        /* Task Cards List */
        <div className="space-y-5">
          {tasks.map((task) => {
            const colorKey: RingColor = (task.color as RingColor) || 'emerald';
            const colorDef = RING_COLORS[colorKey] || RING_COLORS.emerald;
            const goal = getRingGoal({
              active: true,
              frequency: task.schedule?.frequency || '4x-week',
              targetDays: task.schedule?.targetDays,
              targetPeriod: task.schedule?.targetPeriod,
            });
            const stats = calculateTaskStreak(task.history || [], today, goal);
            const isDoneToday = (task.history || []).includes(today);
            const isLogging = loggingId === task._id;

            return (
              <div
                key={task._id}
                className="rounded-2xl border p-4 sm:p-6 transition-all duration-200 bg-white dark:bg-zinc-950/80 border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-none space-y-4"
                style={{
                  borderColor: stats.isThisWeekAchieved ? colorDef.border : undefined,
                  boxShadow: stats.isThisWeekAchieved
                    ? `0 0 20px ${colorDef.glow}`
                    : undefined,
                }}
              >
                {/* Header Row: Color bar, Title, Goal Badge, Actions */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                      style={{ backgroundColor: colorDef.bgSubtle, border: `1px solid ${colorDef.border}` }}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: colorDef.hex }}
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                          style={{
                            backgroundColor: colorDef.bgSubtle,
                            borderColor: colorDef.border,
                            color: colorDef.text,
                          }}
                        >
                          🎯 Goal: {goal.label}
                        </span>

                        {stats.isThisWeekAchieved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                            <Trophy className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                            <span>Weekly Goal Achieved! ({stats.thisWeekSessions}/{goal.targetDays})</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                            Progress: {stats.thisWeekSessions} / {goal.targetDays}{' '}
                            {goal.period === 'week' ? 'days this week' : 'days this month'}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-1">{task.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Right Header Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-start sm:justify-end pt-2 sm:pt-0">
                    {/* View Calendar Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectTaskInCalendar(task._id)}
                      className="h-8 text-xs border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-zinc-300 rounded-xl gap-1.5"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>View Calendar</span>
                    </Button>

                    {/* Log Session Button */}
                    {isOwner && (
                      <Button
                        size="sm"
                        onClick={() => handleLog(task._id)}
                        disabled={isLogging || isDoneToday}
                        className={`h-8 text-xs font-semibold rounded-xl gap-1.5 px-3.5 transition-all ${
                          isDoneToday
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 cursor-default'
                            : 'text-white shadow-md cursor-pointer'
                        }`}
                        style={
                          !isDoneToday
                            ? {
                                backgroundColor: colorDef.hex,
                                boxShadow: `0 0 10px ${colorDef.glow}`,
                              }
                            : {}
                        }
                      >
                        {isDoneToday ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Logged Today</span>
                          </>
                        ) : isLogging ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Logging...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Log Today&apos;s Session</span>
                          </>
                        )}
                      </Button>
                    )}

                    {isOwner && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditTask(task)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                          title="Edit Task"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete task "${task.title}"?`)) {
                              onDeleteTask(task._id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-rose-400"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Middle Content: To-Do Checklist + Linked Topics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/80 dark:border-white/5">
                  {/* To-Do Routine Checklist */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-white/5 space-y-2.5">
                    {(() => {
                      const undoneTodos = (task.todos || []).filter((t) => !t.done);
                      const doneTodos = (task.todos || []).filter((t) => t.done);
                      const isAllExpanded = Boolean(expandedAllTasks[task._id]);
                      const isListExpanded = Boolean(expandedListTasks[task._id]);

                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-300 flex items-center gap-1.5">
                              <ListTodo className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>Routine Checklist ({doneTodos.length}/{task.todos?.length || 0})</span>
                            </span>

                            <div className="flex items-center gap-1">
                              {task.todos && task.todos.length > 0 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => toggleTaskExpandAll(task._id)}
                                    className={`p-1 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                                      isAllExpanded
                                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 font-medium'
                                        : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}
                                    title={isAllExpanded ? "Collapse full text lines" : "Expand full text lines"}
                                  >
                                    <ChevronsUpDown className="w-3.5 h-3.5" />
                                    <span className="text-[10px] hidden sm:inline">
                                      {isAllExpanded ? 'Collapse' : 'Expand Text'}
                                    </span>
                                  </button>

                                  {task.todos.length > 4 && (
                                    <button
                                      type="button"
                                      onClick={() => toggleListHeightExpand(task._id)}
                                      className="p-1 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5 text-[10px] flex items-center gap-0.5"
                                      title={isListExpanded ? "Fit checklist height" : "Expand checklist view"}
                                    >
                                      <span>{isListExpanded ? 'Show Less' : 'Show All'}</span>
                                      {isListExpanded ? (
                                        <ChevronUp className="w-3 h-3" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {(!task.todos || task.todos.length === 0) ? (
                            <p className="text-[11px] text-slate-400 dark:text-zinc-500 italic py-1">
                              No checklist items yet. Add routine steps below.
                            </p>
                          ) : (
                            <div className={`space-y-1.5 ${isListExpanded ? 'max-h-none' : 'max-h-48'} overflow-y-auto pr-1 transition-all`}>
                              {/* Pending / Undone Items (Brought Up the List) */}
                              {undoneTodos.map((item) => {
                                const isExpanded = isAllExpanded || Boolean(expandedTodoIds[item.id]);
                                const isUrl = /^https?:\/\//i.test(item.text.trim());
                                const isLong = item.text.length > 45;

                                return (
                                  <div
                                    key={item.id}
                                    className="group flex items-start gap-2 p-1.5 rounded-lg text-xs transition-colors hover:bg-slate-100 dark:hover:bg-white/5 select-none text-slate-700 dark:text-zinc-200"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={item.done}
                                      disabled={!isOwner}
                                      onChange={(e) => onToggleTodo(task._id, item.id, e.target.checked)}
                                      className="w-3.5 h-3.5 rounded bg-white dark:bg-zinc-900 border-slate-300 dark:border-white/20 text-indigo-600 dark:text-indigo-500 focus:ring-0 cursor-pointer mt-0.5 shrink-0"
                                    />

                                    <div
                                      className="flex-1 min-w-0 cursor-pointer"
                                      onClick={() => {
                                        if (isLong) toggleTodoExpand(item.id);
                                      }}
                                      title={item.text}
                                    >
                                      <span
                                        className={`block ${
                                          isExpanded
                                            ? 'whitespace-pre-wrap break-words leading-relaxed select-text'
                                            : 'truncate'
                                        }`}
                                      >
                                        {item.text}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {isUrl && (
                                        <a
                                          href={item.text.trim()}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 p-0.5"
                                          title="Open link"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                      {isLong && !isAllExpanded && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleTodoExpand(item.id);
                                          }}
                                          className="text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 p-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
                                          title={isExpanded ? 'Collapse' : 'Expand full line'}
                                        >
                                          {isExpanded ? (
                                            <ChevronUp className="w-3 h-3" />
                                          ) : (
                                            <ChevronDown className="w-3 h-3" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Divider between undone and done if both exist */}
                              {doneTodos.length > 0 && undoneTodos.length > 0 && (
                                <div className="pt-2 pb-1 border-t border-slate-200/80 dark:border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                  <span>Completed ({doneTodos.length})</span>
                                </div>
                              )}

                              {/* Completed / Done Items (Put Down on the List) */}
                              {doneTodos.map((item) => {
                                const isExpanded = isAllExpanded || Boolean(expandedTodoIds[item.id]);
                                const isUrl = /^https?:\/\//i.test(item.text.trim());
                                const isLong = item.text.length > 45;

                                return (
                                  <div
                                    key={item.id}
                                    className="group flex items-start gap-2 p-1.5 rounded-lg text-xs transition-colors bg-slate-100/50 dark:bg-white/[0.01] text-slate-400 dark:text-zinc-500 select-none"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={item.done}
                                      disabled={!isOwner}
                                      onChange={(e) => onToggleTodo(task._id, item.id, e.target.checked)}
                                      className="w-3.5 h-3.5 rounded bg-white dark:bg-zinc-900 border-slate-300 dark:border-white/20 text-indigo-600 dark:text-indigo-500 focus:ring-0 cursor-pointer mt-0.5 shrink-0 opacity-70"
                                    />

                                    <div
                                      className="flex-1 min-w-0 cursor-pointer line-through"
                                      onClick={() => {
                                        if (isLong) toggleTodoExpand(item.id);
                                      }}
                                      title={item.text}
                                    >
                                      <span
                                        className={`block ${
                                          isExpanded
                                            ? 'whitespace-pre-wrap break-words leading-relaxed select-text'
                                            : 'truncate'
                                        }`}
                                      >
                                        {item.text}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {isUrl && (
                                        <a
                                          href={item.text.trim()}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 p-0.5"
                                          title="Open link"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                      {isLong && !isAllExpanded && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleTodoExpand(item.id);
                                          }}
                                          className="text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 p-0.5 opacity-70 group-hover:opacity-100"
                                          title={isExpanded ? 'Collapse' : 'Expand full line'}
                                        >
                                          {isExpanded ? (
                                            <ChevronUp className="w-3 h-3" />
                                          ) : (
                                            <ChevronDown className="w-3 h-3" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {isOwner && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          value={inlineTodoText[task._id] || ''}
                          onChange={(e) =>
                            setInlineTodoText((prev) => ({ ...prev, [task._id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleQuickAddTodo(task._id);
                            }
                          }}
                          placeholder="Add quick checklist item..."
                          className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 rounded-lg px-2.5 py-1 flex-1 focus:outline-hidden focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuickAddTodo(task._id)}
                          disabled={addingTodoId === task._id || !inlineTodoText[task._id]?.trim()}
                          className="p-1 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30"
                          title="Add item"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Linked Knowledge Topics */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-white/5 space-y-2.5">
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-300 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <span>Linked Knowledge Topics ({task.linkedTopicIds?.length || 0})</span>
                    </span>

                    {(!task.linkedTopicIds || task.linkedTopicIds.length === 0) ? (
                      <p className="text-[11px] text-slate-500 dark:text-zinc-500 italic py-1">
                        No topics linked to this task yet. Edit task to link study notes.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                        {task.linkedTopicIds.map((tid) => {
                          const top = topicMap.get(tid);
                          return (
                            <button
                              key={tid}
                              type="button"
                              onClick={() => onOpenTopic(tid)}
                              className="px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 hover:border-indigo-500/50 flex items-center gap-1.5 transition-all group"
                            >
                              <span className="truncate max-w-[160px]">{top?.title || 'Topic Note'}</span>
                              <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="pt-2 text-[11px] text-slate-500 dark:text-zinc-500 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                        {stats.currentStreak} Day Streak
                      </span>
                      <span>•</span>
                      <span>{stats.totalSessions} Sessions</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {stats.achievedWeeksCount} Weeks Achieved
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
