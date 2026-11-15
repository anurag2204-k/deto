'use client';

import { useMemo, useState, useEffect } from 'react';
import { ActivityMap, LightweightTopic, RingColor, Task } from '@/lib/types';
import {
  generateCalendarWeeks,
  calculateStudyStreak,
  CalendarDayInfo,
  generateTaskCalendarWeeks,
  calculateTaskStreak,
  getRingGoal,
  RING_COLORS,
  TaskCalendarDayInfo,
} from '@/lib/logic';
import {
  Flame,
  Calendar as CalendarIcon,
  Sparkles,
  Check,
  Trophy,
  Layers,
  Target,
  Plus,
  Link as LinkIcon,
  ArrowUpRight,
  ListTodo,
} from 'lucide-react';

interface ActivityCalendarProps {
  activityMap: ActivityMap;
  today: string;
  tasks?: Task[];
  topics?: LightweightTopic[];
  selectedTaskId?: string | null;
  onLogTaskSession?: (taskId: string) => Promise<void>;
  onOpenCreateTask?: () => void;
  onOpenTopic?: (topicId: string) => void;
}

export function ActivityCalendar({
  activityMap,
  today,
  tasks = [],
  topics = [],
  selectedTaskId,
  onLogTaskSession,
  onOpenCreateTask,
  onOpenTopic,
}: ActivityCalendarProps) {
  // Calendar View Filter: 'overview' | 'queue' | taskId
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [hoveredOverviewDay, setHoveredOverviewDay] = useState<CalendarDayInfo | null>(null);
  const [hoveredTaskDay, setHoveredTaskDay] = useState<TaskCalendarDayInfo | null>(null);
  const [isLoggingToday, setIsLoggingToday] = useState(false);

  const topicMap = useMemo(() => new Map(topics.map((t) => [t._id, t])), [topics]);

  // Sync when selectedTaskId prop changes from parent
  useEffect(() => {
    if (selectedTaskId) {
      setActiveSection(selectedTaskId);
    }
  }, [selectedTaskId]);

  // Overall Overview calculations
  const overviewWeeks = useMemo(() => {
    if (!today) return [];
    return generateCalendarWeeks(today, 24, activityMap);
  }, [today, activityMap]);

  const { currentStreak: overallStreak, totalActiveDays: overallActiveDays } = useMemo(() => {
    if (!today) return { currentStreak: 0, totalActiveDays: 0 };
    return calculateStudyStreak(activityMap, today);
  }, [activityMap, today]);

  // Selected specific task (if not overview or queue)
  const selectedTask = useMemo(() => {
    if (activeSection === 'overview' || activeSection === 'queue') return null;
    return tasks.find((t) => t._id === activeSection) || null;
  }, [activeSection, tasks]);

  // Goal & Color configuration for selected task
  const selectedTaskGoal = useMemo(() => {
    if (!selectedTask) return null;
    return getRingGoal({
      active: true,
      frequency: selectedTask.schedule?.frequency || '4x-week',
      targetDays: selectedTask.schedule?.targetDays,
      targetPeriod: selectedTask.schedule?.targetPeriod,
    });
  }, [selectedTask]);

  const selectedTaskColorKey: RingColor = useMemo(() => {
    if (!selectedTask?.color) return 'emerald';
    return selectedTask.color in RING_COLORS
      ? (selectedTask.color as RingColor)
      : 'emerald';
  }, [selectedTask]);

  const selectedTaskColor = RING_COLORS[selectedTaskColorKey];

  // History & Weeks for selected task
  const selectedTaskHistory = useMemo(() => {
    if (!selectedTask) return [];
    return selectedTask.history || [];
  }, [selectedTask]);

  const selectedTaskWeeks = useMemo(() => {
    if (!today || !selectedTaskGoal) return [];
    return generateTaskCalendarWeeks(today, 24, selectedTaskHistory, selectedTaskGoal);
  }, [today, selectedTaskHistory, selectedTaskGoal]);

  const selectedTaskStats = useMemo(() => {
    if (!today || !selectedTaskGoal) return null;
    return calculateTaskStreak(selectedTaskHistory, today, selectedTaskGoal);
  }, [today, selectedTaskHistory, selectedTaskGoal]);

  const isTodayLoggedForTask = useMemo(() => {
    if (!today || !selectedTaskHistory) return false;
    return selectedTaskHistory.includes(today);
  }, [today, selectedTaskHistory]);

  function formatDateFriendly(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  const handleQuickLogToday = async () => {
    if (!selectedTask || !onLogTaskSession || isLoggingToday) return;
    setIsLoggingToday(true);
    try {
      await onLogTaskSession(selectedTask._id);
    } finally {
      setIsLoggingToday(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-3.5 sm:p-6 backdrop-blur-xl shadow-lg space-y-4">
      {/* Top Section Nav Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        {/* Left Title & Segment Selector */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 via-amber-500/10 to-emerald-500/10 border border-white/10 flex items-center justify-center text-indigo-400 shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Activity &amp; Task Heatmap Calendars</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Multi-calendar tracker — switch between overall activity, study queue, and individual scheduled tasks.
              </p>
            </div>
          </div>

          {/* Section Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setActiveSection('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeSection === 'overview'
                  ? 'bg-indigo-600/30 border border-indigo-500/50 text-white shadow-xs'
                  : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('queue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeSection === 'queue'
                  ? 'bg-indigo-600/30 border border-indigo-500/50 text-white shadow-xs'
                  : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Queue &amp; Revisions</span>
            </button>

            {/* Individual Task Pills */}
            {tasks.map((task) => {
              const colorKey: RingColor = (task.color as RingColor) || 'emerald';
              const colorDef = RING_COLORS[colorKey] || RING_COLORS.emerald;
              const isSelected = activeSection === task._id;
              const goal = getRingGoal({
                active: true,
                frequency: task.schedule?.frequency || '4x-week',
                targetDays: task.schedule?.targetDays,
                targetPeriod: task.schedule?.targetPeriod,
              });

              return (
                <button
                  key={task._id}
                  type="button"
                  onClick={() => setActiveSection(task._id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'border shadow-xs'
                      : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: colorDef.bgSubtle,
                          borderColor: colorDef.border,
                          color: '#ffffff',
                          boxShadow: `0 0 10px ${colorDef.glow}`,
                        }
                      : {}
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: colorDef.hex }}
                  />
                  <span>{task.title}</span>
                  <span className="text-[10px] opacity-70">
                    ({goal.period === 'week' ? `${goal.targetDays}x/wk` : `${goal.targetDays}x/mo`})
                  </span>
                </button>
              );
            })}

            {tasks.length === 0 && onOpenCreateTask && (
              <button
                type="button"
                onClick={onOpenCreateTask}
                className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-emerald-400 hover:bg-white/5 transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>+ Create Task (Gym, etc.)</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Stats: Contextual based on active section */}
        {selectedTask && selectedTaskStats && selectedTaskGoal ? (
          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-2">
              {/* Weekly/Monthly Goal Achievement Pill */}
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-xs"
                style={{
                  backgroundColor: selectedTaskStats.isThisWeekAchieved
                    ? selectedTaskColor.bgSubtle
                    : 'rgba(255,255,255,0.05)',
                  borderColor: selectedTaskStats.isThisWeekAchieved
                    ? selectedTaskColor.border
                    : 'rgba(255,255,255,0.1)',
                  color: selectedTaskStats.isThisWeekAchieved
                    ? selectedTaskColor.text
                    : '#94a3b8',
                }}
              >
                {selectedTaskStats.isThisWeekAchieved ? (
                  <>
                    <Trophy className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                    <span>Goal Met: {selectedTaskStats.thisWeekSessions} / {selectedTaskGoal.targetDays} this week!</span>
                  </>
                ) : (
                  <>
                    <Target className="w-3.5 h-3.5" style={{ color: selectedTaskColor.hex }} />
                    <span>
                      {selectedTaskStats.thisWeekSessions} / {selectedTaskGoal.targetDays}{' '}
                      {selectedTaskGoal.period === 'week' ? 'days this week' : 'days this month'}
                    </span>
                  </>
                )}
              </div>

              {/* Quick Log Button if not logged today */}
              {onLogTaskSession && (
                <button
                  type="button"
                  onClick={handleQuickLogToday}
                  disabled={isLoggingToday || isTodayLoggedForTask}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    isTodayLoggedForTask
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 cursor-default'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 text-white cursor-pointer active:scale-95'
                  }`}
                >
                  {isTodayLoggedForTask ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Logged Today</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>{isLoggingToday ? 'Logging...' : 'Log Session Today'}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                {selectedTaskStats.currentStreak} Day Streak
              </span>
              <span>•</span>
              <span>{selectedTaskStats.totalSessions} Total Sessions</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">
                {selectedTaskStats.achievedWeeksCount} Weeks Achieved
              </span>
            </div>
          </div>
        ) : (
          /* Overview or Queue stats */
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-semibold shadow-xs">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
              <span>{overallStreak} Day Streak</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-zinc-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{overallActiveDays} Active Days</span>
            </div>
          </div>
        )}
      </div>

      {/* HEATMAP CALENDAR DISPLAY */}
      {selectedTask && selectedTaskGoal ? (
        /* ================= SPECIFIC TASK CALENDAR ================= */
        <div className="relative space-y-3">
          {/* Target Description & Linked Topics Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: selectedTaskColor.hex }}
                />
                <span className="text-white font-semibold">{selectedTask.title}:</span>
                <span className="text-zinc-300">{selectedTaskGoal.label}</span>
              </div>

              {/* Linked Topics chips */}
              {selectedTask.linkedTopicIds && selectedTask.linkedTopicIds.length > 0 && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
                  <span className="text-zinc-500 flex items-center gap-1 text-[11px]">
                    <LinkIcon className="w-3 h-3 text-amber-400" />
                    Topics:
                  </span>
                  {selectedTask.linkedTopicIds.map((tid) => {
                    const top = topicMap.get(tid);
                    return (
                      <button
                        key={tid}
                        type="button"
                        onClick={() => onOpenTopic && onOpenTopic(tid)}
                        className="px-2 py-0.5 rounded-md text-[11px] bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:border-indigo-400 flex items-center gap-1"
                        title="Open topic notes"
                      >
                        <span className="truncate max-w-[120px]">{top?.title || 'Note'}</span>
                        <ArrowUpRight className="w-2.5 h-2.5 text-zinc-500" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* To-Do preview */}
              {selectedTask.todos && selectedTask.todos.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-zinc-400 pl-2 border-l border-white/10">
                  <ListTodo className="w-3 h-3 text-indigo-400" />
                  <span>
                    Checklist: {selectedTask.todos.filter((t) => t.done).length}/{selectedTask.todos.length} done
                  </span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <span>Goal achieved: </span>
              <span
                className="px-1.5 py-0.5 rounded font-semibold text-[10px]"
                style={{
                  backgroundColor: selectedTaskColor.bgWeekAchieved,
                  color: selectedTaskColor.text,
                }}
              >
                entire week block is colored
              </span>
              <span> in {selectedTaskColor.name.split(' ')[0]}!</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-white/10 touch-pan-x -webkit-overflow-scrolling-touch">
            <div className="min-w-[620px] space-y-1.5">
              {/* Month labels along top */}
              <div className="flex text-[11px] text-zinc-500 font-mono pl-7 h-4">
                {selectedTaskWeeks.map((week, idx) => (
                  <div key={idx} className="w-[18px] sm:w-[22px] shrink-0 text-left">
                    {week.monthLabel && <span>{week.monthLabel}</span>}
                  </div>
                ))}
              </div>

              {/* Grid of Days (7 rows by N weeks) */}
              <div className="flex gap-1.5">
                {/* Day of week labels on left (Mon, Wed, Fri) */}
                <div className="flex flex-col justify-between text-[10px] text-zinc-500 font-mono w-5 shrink-0 py-0.5">
                  <span></span>
                  <span>Mon</span>
                  <span></span>
                  <span>Wed</span>
                  <span></span>
                  <span>Fri</span>
                  <span></span>
                </div>

                {/* Weeks Columns */}
                <div className="flex gap-1 sm:gap-1.5">
                  {selectedTaskWeeks.map((week, weekIdx) => {
                    const isAchieved = week.isGoalAchieved;

                    // Container styling for whole-week goal achievement
                    const weekContainerStyle: React.CSSProperties = isAchieved
                      ? {
                          backgroundColor: selectedTaskColor.bgSubtle,
                          borderColor: selectedTaskColor.border,
                          boxShadow: `0 0 12px ${selectedTaskColor.glow}`,
                        }
                      : {};

                    return (
                      <div
                        key={weekIdx}
                        style={weekContainerStyle}
                        className={`flex flex-col gap-1 sm:gap-1.5 p-0.5 rounded-md transition-all duration-300 ${
                          isAchieved
                            ? 'border'
                            : 'border border-transparent'
                        }`}
                        title={
                          isAchieved
                            ? `Week Goal Achieved! (${week.completedCount}/${week.targetDays} sessions)`
                            : `${week.completedCount}/${week.targetDays} sessions`
                        }
                      >
                        {week.days.map((day, dayIdx) => {
                          if (!day) {
                            return <div key={dayIdx} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
                          }

                          let cellStyle: React.CSSProperties = {};
                          let cellClass =
                            'w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px] transition-all duration-150 cursor-pointer relative ';

                          if (day.isFuture) {
                            cellClass += 'bg-zinc-950/40 border border-white/[0.03] opacity-30 cursor-default';
                          } else if (day.hasSession) {
                            // Solid Task Color
                            cellStyle = {
                              backgroundColor: selectedTaskColor.hex,
                              borderColor: selectedTaskColor.border,
                              boxShadow: `0 0 8px ${selectedTaskColor.glow}`,
                            };
                            cellClass += 'border hover:scale-125 hover:z-20';
                          } else if (day.weekGoalAchieved) {
                            // Rest day in an ACHIEVED week: Entire week is colored!
                            cellStyle = {
                              backgroundColor: selectedTaskColor.bgWeekAchieved,
                              borderColor: selectedTaskColor.border,
                            };
                            cellClass += 'border opacity-85 hover:scale-125 hover:z-20';
                          } else {
                            // Empty rest day
                            cellClass +=
                              'bg-zinc-900/80 border border-white/5 hover:border-white/20 hover:bg-zinc-800';
                          }

                          if (day.isToday) {
                            cellClass += ' ring-1 ring-white/70 ring-offset-1 ring-offset-black';
                          }

                          return (
                            <div
                              key={day.date}
                              style={cellStyle}
                              className={cellClass}
                              onMouseEnter={() => setHoveredTaskDay(day)}
                              onMouseLeave={() => setHoveredTaskDay(null)}
                              aria-label={`${day.date}: ${
                                day.hasSession
                                  ? `${selectedTask.title} completed`
                                  : day.weekGoalAchieved
                                  ? `Rest day (Week goal met)`
                                  : 'No session'
                              }`}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Hover Tooltip & Legend for Specific Task */}
          <div className="min-h-[26px] flex flex-wrap items-center justify-between gap-3 text-xs pt-2 text-zinc-400">
            {hoveredTaskDay ? (
              <div className="flex items-center gap-2 animate-in fade-in duration-150">
                <span className="font-medium text-white">{formatDateFriendly(hoveredTaskDay.date)}:</span>
                {hoveredTaskDay.hasSession ? (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: selectedTaskColor.text }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: selectedTaskColor.hex }}
                    />
                    ✓ {selectedTask.title} Completed!
                  </span>
                ) : hoveredTaskDay.weekGoalAchieved ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    Rest Day — Weekly Goal ({selectedTaskGoal.targetDays} days) Achieved for this Week!
                  </span>
                ) : hoveredTaskDay.isFuture ? (
                  <span className="text-zinc-600">Upcoming day</span>
                ) : (
                  <span className="text-zinc-500">No session logged on this date</span>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-zinc-500">
                Hover over any day box to inspect session logs and weekly goal completions
              </span>
            )}

            {/* Task Legend */}
            <div className="flex items-center gap-3 text-[11px] text-zinc-400 shrink-0">
              <span className="text-zinc-600">Legend:</span>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-zinc-900 border border-white/10" />
                <span className="text-zinc-500 text-[10px]">Rest Day</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-2.5 h-2.5 rounded-[2px]"
                  style={{ backgroundColor: selectedTaskColor.hex }}
                />
                <span className="text-white text-[10px] font-medium">Session Logged</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-2.5 h-2.5 rounded-[2px] border"
                  style={{
                    backgroundColor: selectedTaskColor.bgWeekAchieved,
                    borderColor: selectedTaskColor.border,
                  }}
                />
                <span style={{ color: selectedTaskColor.text }} className="text-[10px] font-semibold">
                  Whole Week Achieved
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= OVERVIEW / QUEUE CALENDAR ================= */
        <div className="relative">
          <div className="overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-white/10 touch-pan-x -webkit-overflow-scrolling-touch">
            <div className="min-w-[620px] space-y-1.5">
              {/* Month labels along top */}
              <div className="flex text-[11px] text-zinc-500 font-mono pl-7 h-4">
                {overviewWeeks.map((week, idx) => (
                  <div key={idx} className="w-[18px] sm:w-[22px] shrink-0 text-left">
                    {week.monthLabel && <span>{week.monthLabel}</span>}
                  </div>
                ))}
              </div>

              {/* Grid of Days (7 rows by N weeks) */}
              <div className="flex gap-1.5">
                {/* Day of week labels on left (Mon, Wed, Fri) */}
                <div className="flex flex-col justify-between text-[10px] text-zinc-500 font-mono w-5 shrink-0 py-0.5">
                  <span></span>
                  <span>Mon</span>
                  <span></span>
                  <span>Wed</span>
                  <span></span>
                  <span>Fri</span>
                  <span></span>
                </div>

                {/* Weeks Columns */}
                <div className="flex gap-1 sm:gap-1.5">
                  {overviewWeeks.map((week, weekIdx) => (
                    <div key={weekIdx} className="flex flex-col gap-1 sm:gap-1.5">
                      {week.days.map((day, dayIdx) => {
                        if (!day) {
                          return <div key={dayIdx} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
                        }

                        const showQueueOnly = activeSection === 'queue';
                        const hasQueue = day.hasQueue;
                        const hasRing = !showQueueOnly && day.hasRing;
                        const hasBoth = !showQueueOnly && day.hasBoth;

                        // Style computation based on blue (queue) & yellow (ring/tasks)
                        let cellStyle: React.CSSProperties = {};
                        let cellClass =
                          'w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px] transition-all duration-150 cursor-pointer relative ';

                        if (day.isFuture) {
                          cellClass += 'bg-zinc-950/40 border border-white/[0.03] opacity-30 cursor-default';
                        } else if (hasBoth) {
                          // Split diagonal gradient: Top-Left Blue, Bottom-Right Yellow/Amber
                          cellStyle = {
                            background: 'linear-gradient(135deg, #6366f1 50%, #f59e0b 50%)',
                            boxShadow: '0 0 10px rgba(99,102,241,0.45)',
                          };
                          cellClass += 'border border-indigo-400/80 hover:scale-125 hover:z-20';
                        } else if (hasQueue) {
                          // Blue only
                          cellClass +=
                            'bg-indigo-500 border border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)] hover:scale-125 hover:z-20';
                        } else if (hasRing) {
                          // Amber / task activity
                          cellClass +=
                            'bg-amber-400 border border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.5)] hover:scale-125 hover:z-20';
                        } else {
                          // Empty / no activity
                          cellClass +=
                            'bg-zinc-900/80 border border-white/5 hover:border-white/20 hover:bg-zinc-800';
                        }

                        if (day.isToday) {
                          cellClass += ' ring-1 ring-white/60 ring-offset-1 ring-offset-black';
                        }

                        return (
                          <div
                            key={day.date}
                            style={cellStyle}
                            className={cellClass}
                            onMouseEnter={() => setHoveredOverviewDay(day)}
                            onMouseLeave={() => setHoveredOverviewDay(null)}
                            aria-label={`${day.date}: ${
                              hasBoth
                                ? 'Queue and Task completed'
                                : hasQueue
                                ? 'Queue completed'
                                : hasRing
                                ? 'Task completed'
                                : 'No activity'
                            }`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hover Tooltip display banner */}
          <div className="min-h-[26px] flex flex-wrap items-center justify-between gap-3 text-xs pt-2 text-zinc-400">
            {hoveredOverviewDay ? (
              <div className="flex items-center gap-2 animate-in fade-in duration-150">
                <span className="font-medium text-white">{formatDateFriendly(hoveredOverviewDay.date)}:</span>
                {hoveredOverviewDay.hasBoth && activeSection !== 'queue' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-white font-semibold">
                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-amber-400" />
                    Both Done! (Topic Revision &amp; Scheduled Task Logged)
                  </span>
                ) : hoveredOverviewDay.hasQueue ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_5px_#6366f1]" />
                    Topic Queue / Revision Completed
                  </span>
                ) : hoveredOverviewDay.hasRing && activeSection !== 'queue' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_5px_#f59e0b]" />
                    Scheduled Task Session Logged
                  </span>
                ) : hoveredOverviewDay.isFuture ? (
                  <span className="text-zinc-600">Upcoming day</span>
                ) : (
                  <span className="text-zinc-500">No sessions logged on this day</span>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-zinc-500">
                Hover over any day box to inspect session details, or click on a task pill above to open its personal calendar
              </span>
            )}

            {/* Color Legend */}
            <div className="flex items-center gap-3 text-[11px] text-zinc-400 shrink-0">
              <span className="text-zinc-600">Legend:</span>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-zinc-900 border border-white/10" />
                <span className="text-zinc-500 text-[10px]">None</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-500 shadow-[0_0_5px_#6366f1]" />
                <span className="text-indigo-300 text-[10px]">Queue / Rev</span>
              </div>
              {activeSection !== 'queue' && (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-amber-400 shadow-[0_0_5px_#f59e0b]" />
                    <span className="text-amber-300 text-[10px]">Task Session</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-2.5 h-2.5 rounded-[2px] border border-indigo-400/60"
                      style={{ background: 'linear-gradient(135deg, #6366f1 50%, #f59e0b 50%)' }}
                    />
                    <span className="text-white text-[10px] font-medium">Both</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
