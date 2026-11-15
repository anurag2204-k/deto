'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoginDialog } from '@/components/LoginDialog';
import { AboutDialog } from '@/components/AboutDialog';
import { QueueView } from '@/components/QueueView';
import { DueView } from '@/components/DueView';
import { TaskListView } from '@/components/TaskListView';
import { TaskModal } from '@/components/TaskModal';
import { ActivityCalendar } from '@/components/ActivityCalendar';
import { AtmosphericBackdrop } from '@/components/AtmosphericBackdrop';
import { ActivityMap, LightweightTopic, Task, RingColor, RingFrequency } from '@/lib/types';
import {
  getMe,
  logout,
  getTopics,
  getActivity,
  deleteTopic,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  logTaskSession,
  toggleTaskTodo,
  addTaskTodo,
  ApiError,
} from '@/lib/api';
import {
  Layers,
  Calendar,
  Info,
  Plus,
  LogIn,
  LogOut,
  AlertCircle,
  CheckSquare,
} from 'lucide-react';

function getLocalDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DetoApp() {
  const router = useRouter();
  const [today, setToday] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'due' | 'tasks'>('queue');

  // Topics & Tasks
  const [queueTopics, setQueueTopics] = useState<LightweightTopic[]>([]);
  const [dueTopics, setDueTopics] = useState<LightweightTopic[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activityMap, setActivityMap] = useState<ActivityMap>({});

  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDue, setLoadingDue] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dialogs
  const [loginOpen, setLoginOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedCalendarTaskId, setSelectedCalendarTaskId] = useState<string | null>(null);
  const [deleteTopicTarget, setDeleteTopicTarget] = useState<LightweightTopic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setToday(getLocalDateString());
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const res = await getMe();
      setIsOwner(res.isOwner);
    } catch {
      setIsOwner(false);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const list = await getTopics('queue');
      setQueueTopics(list);
      setLoadError(null);
    } catch (err) {
      console.error('Failed to load queue topics', err);
      const msg = err instanceof Error ? err.message : 'Failed to load queue topics';
      setLoadError(msg);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  const fetchDue = useCallback(async (todayStr: string) => {
    if (!todayStr) return;
    setLoadingDue(true);
    try {
      const list = await getTopics('due', todayStr);
      setDueTopics(list);
      setLoadError(null);
    } catch (err) {
      console.error('Failed to load due topics', err);
      const msg = err instanceof Error ? err.message : 'Failed to load due topics';
      setLoadError(msg);
    } finally {
      setLoadingDue(false);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const list = await getTasks();
      setTasks(list);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const act = await getActivity();
      setActivityMap(act);
    } catch (err) {
      console.error('Failed to load activity heatmap', err);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    fetchQueue();
    fetchTasks();
    fetchActivity();
  }, [checkAuth, fetchQueue, fetchTasks, fetchActivity]);

  useEffect(() => {
    if (today) {
      fetchDue(today);
    }
  }, [today, fetchDue]);

  // Seed sample Gym task if user has 0 tasks and is authenticated owner
  useEffect(() => {
    if (isOwner && !loadingTasks && tasks.length === 0) {
      createTask({
        title: 'Gym Workout',
        description: 'Strength training & progressive overload routine at least 4 days a week',
        color: 'emerald',
        frequency: '4x-week',
        targetDays: 4,
        targetPeriod: 'week',
        todos: [
          { id: 'todo-1', text: 'Main compound lift sets', done: false },
          { id: 'todo-2', text: 'Accessory & isolation exercises', done: false },
          { id: 'todo-3', text: '15-20 min cardio / incline walk', done: false },
        ],
      })
        .then((seeded) => {
          setTasks([seeded]);
        })
        .catch(() => {});
    }
  }, [isOwner, loadingTasks, tasks.length]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOwner(false);
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTopicTarget) return;
    setIsDeleting(true);

    try {
      await deleteTopic(deleteTopicTarget._id);
      setQueueTopics((prev) => prev.filter((t) => t._id !== deleteTopicTarget._id));
      setDueTopics((prev) => prev.filter((t) => t._id !== deleteTopicTarget._id));
      setDeleteTopicTarget(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setIsOwner(false);
        setLoginOpen(true);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Task Actions
  const handleSaveTask = async (data: {
    title: string;
    description?: string;
    color: RingColor;
    frequency: RingFrequency;
    targetDays?: number;
    targetPeriod?: 'week' | 'month';
    todos: Array<{ id?: string; text: string; done?: boolean }>;
    linkedTopicIds: string[];
  }) => {
    if (editingTask) {
      const updated = await updateTask(editingTask._id, data);
      setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    } else {
      const created = await createTask(data);
      setTasks((prev) => [created, ...prev]);
    }
    fetchActivity();
  };

  const handleLogTaskSession = async (taskId: string) => {
    try {
      // Optimistic update for instant feedback & badge clearance
      if (today) {
        setTasks((prev) =>
          prev.map((t) => {
            if (t._id === taskId) {
              const hist = t.history || [];
              return hist.includes(today) ? t : { ...t, history: [...hist, today] };
            }
            return t;
          })
        );
      }

      const updated = await logTaskSession(taskId, today);
      setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
      fetchActivity();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setIsOwner(false);
        setLoginOpen(true);
      }
      fetchTasks();
      fetchActivity();
    }
  };

  const handleQueueActivityLogged = useCallback(() => {
    if (today) {
      setActivityMap((prev) => ({
        ...prev,
        [today]: {
          ...(prev[today] || {}),
          queue: true,
          count: (prev[today]?.count || 0) + 1,
        },
      }));
    }
    fetchActivity();
  }, [today, fetchActivity]);

  const handleToggleTaskTodo = async (taskId: string, todoId: string, done: boolean) => {
    try {
      const updated = await toggleTaskTodo(taskId, todoId, done);
      setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    } catch (err) {
      console.error('Failed to toggle todo', err);
    }
  };

  const handleAddTaskTodo = async (taskId: string, text: string) => {
    try {
      const updated = await addTaskTodo(taskId, text);
      setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    } catch (err) {
      console.error('Failed to add todo', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      fetchActivity();
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  const openNewNotePage = () => {
    router.push('/topics/new');
  };

  const openTopicPage = (topicId: string) => {
    router.push(`/topics/${topicId}`);
  };

  // Pending counts: Only show badge when an action is pending / left for today!
  const isTodayQueueTopicDone =
    Boolean(activityMap[today]?.queue) ||
    (queueTopics.length > 0 && queueTopics[0].studiedOn === today);
  const pendingQueueCount = !today || queueTopics.length === 0 || isTodayQueueTopicDone ? 0 : 1;
  const pendingTasksCount = !today
    ? 0
    : tasks.filter((t) => !(t.history || []).includes(today)).length;

  return (
    <div className="min-h-screen flex bg-[#090a10] text-[#f8fafc]">
      {/* DESKTOP SIDEBAR NAVIGATION - Sticky full-height pinned footer */}
      <aside className="hidden md:flex flex-col justify-between w-64 h-screen sticky top-0 border-r border-white/5 bg-[#090a10]/80 backdrop-blur-xl p-6 shrink-0 z-20">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 via-emerald-500/10 to-amber-500/20 border border-white/10 flex items-center justify-center text-indigo-400 font-bold text-lg shadow-sm">
              ∞
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Deto</span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'queue'
                  ? 'bg-indigo-950/50 border border-indigo-500/30 text-white shadow-sm shadow-indigo-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className={`w-4 h-4 ${activeTab === 'queue' ? 'text-indigo-400' : 'text-zinc-400'}`} />
                <span>Queue</span>
              </div>
              {pendingQueueCount > 0 && (
                <Badge className="bg-indigo-600 text-white text-[11px] px-2 py-0 font-semibold shadow-xs">
                  {pendingQueueCount}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('due')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'due'
                  ? 'bg-indigo-950/50 border border-indigo-500/30 text-white shadow-sm shadow-indigo-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className={`w-4 h-4 ${activeTab === 'due' ? 'text-indigo-400' : 'text-zinc-400'}`} />
                <span>Due</span>
              </div>
              {dueTopics.length > 0 && (
                <Badge className="bg-indigo-600 text-white text-[11px] px-2 py-0">
                  {dueTopics.length}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'tasks'
                  ? 'bg-emerald-950/40 border border-emerald-500/30 text-white shadow-sm shadow-emerald-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckSquare className={`w-4 h-4 ${activeTab === 'tasks' ? 'text-emerald-400' : 'text-zinc-400'}`} />
                <span>Tasks &amp; Habits</span>
              </div>
              {pendingTasksCount > 0 && (
                <Badge className="bg-emerald-500 text-white text-[11px] px-2 py-0 font-semibold shadow-xs">
                  {pendingTasksCount}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Info className="w-4 h-4 text-zinc-400" />
              <span>About</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer - Always pinned at bottom */}
        <div className="pt-6 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
          <span>A personal task &amp; habit tracker</span>
          <span className="text-indigo-400 font-bold">∞</span>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Mountain Atmosphere Graphic in Top Right */}
        <AtmosphericBackdrop />

        {/* Top Header / Profile Bar */}
        <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between bg-[#090a10]/40 backdrop-blur-md border-b border-white/5">
          {/* Mobile brand header */}
          <div className="flex items-center gap-2.5 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-white/10 flex items-center justify-center text-indigo-400 font-bold text-sm">
              ∞
            </div>
            <span className="font-bold text-lg text-white">Deto</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400">
            {today && <span>{today}</span>}
          </div>

          {/* Right Header Buttons: Separate New Topic & New Task buttons */}
          <div className="flex items-center gap-3 ml-auto">
            {isOwner ? (
              <div className="flex items-center gap-2.5">
                {/* Create Topic Button */}
                <Button
                  onClick={openNewNotePage}
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 font-medium rounded-lg gap-1.5"
                  title="Create study notes / topic in queue"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>New Topic</span>
                </Button>

                {/* Create Task Button */}
                <Button
                  onClick={() => {
                    setEditingTask(null);
                    setTaskModalOpen(true);
                  }}
                  size="sm"
                  className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-600/20 rounded-lg gap-1.5"
                  title="Create scheduled task (Gym, habit, checklist)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Task</span>
                </Button>

                {/* Profile Pill */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-zinc-900/80">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                    A
                  </div>
                  <span className="text-xs text-zinc-300 font-medium">anurag</span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-zinc-500 hover:text-zinc-300 ml-1 p-0.5"
                    title="Logout"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLoginOpen(true)}
                className="h-8 px-3 text-xs border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 rounded-lg gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Owner Login</span>
              </Button>
            )}
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 px-4 sm:px-8 py-8 max-w-6xl w-full mx-auto space-y-8 z-10">
          {loadError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Database Connection Error</p>
                <p className="mt-0.5 leading-relaxed opacity-90">{loadError}</p>
              </div>
            </div>
          )}

          {/* Hero Typography Section */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Keep Moving,<br />Keep Evolving
            </h1>
            <p className="text-sm sm:text-base text-zinc-400">
              Track your daily tasks, habits, and queue rotations so you never fall behind.
            </p>
          </div>

          {/* Activity Heatmap Calendar (Multi-Section & Task Calendars) */}
          <ActivityCalendar
            activityMap={activityMap}
            today={today}
            tasks={tasks}
            topics={queueTopics}
            selectedTaskId={selectedCalendarTaskId}
            onLogTaskSession={handleLogTaskSession}
            onOpenCreateTask={() => {
              setEditingTask(null);
              setTaskModalOpen(true);
            }}
            onOpenTopic={openTopicPage}
          />

          {/* View Switcher Tabs (Queue | Due | Tasks & Habits) */}
          <div className="flex items-center gap-6 border-b border-white/10 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-2 pb-2 text-sm font-medium transition-all relative ${
                activeTab === 'queue'
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Queue</span>
              {pendingQueueCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  {pendingQueueCount}
                </span>
              )}
              {activeTab === 'queue' && (
                <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_#6366f1]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('due')}
              className={`flex items-center gap-2 pb-2 text-sm font-medium transition-all relative ${
                activeTab === 'due'
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Due</span>
              {dueTopics.length > 0 && (
                <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0 ml-1">
                  {dueTopics.length}
                </Badge>
              )}
              {activeTab === 'due' && (
                <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_#6366f1]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 pb-2 text-sm font-medium transition-all relative ${
                activeTab === 'tasks'
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span>Tasks &amp; Habits</span>
              {pendingTasksCount > 0 && (
                <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 ml-1">
                  {pendingTasksCount}
                </Badge>
              )}
              {activeTab === 'tasks' && (
                <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_#10b981]" />
              )}
            </button>
          </div>

          {/* Active Tab View */}
          {activeTab === 'queue' ? (
            loadingQueue ? (
              <div className="py-20 text-center text-sm text-zinc-500">
                Loading task queue...
              </div>
            ) : (
              <QueueView
                topics={queueTopics}
                isOwner={isOwner}
                onTopicsChange={setQueueTopics}
                onEditTopic={(topic) => router.push(`/topics/${topic._id}`)}
                onSelectTopic={openTopicPage}
                onOpenAddModal={openNewNotePage}
                onDeleteTopic={setDeleteTopicTarget}
                onActivityLogged={handleQueueActivityLogged}
                onUnauthorized={() => {
                  setIsOwner(false);
                  setLoginOpen(true);
                }}
              />
            )
          ) : activeTab === 'due' ? (
            loadingDue ? (
              <div className="py-20 text-center text-sm text-zinc-500">
                Loading due revisions...
              </div>
            ) : (
              <DueView
                topics={dueTopics}
                today={today}
                isOwner={isOwner}
                onTopicRevisionDone={(doneId) => {
                  setDueTopics((prev) => prev.filter((t) => t._id !== doneId));
                  fetchActivity();
                }}
                onUnauthorized={() => {
                  setIsOwner(false);
                  setLoginOpen(true);
                }}
              />
            )
          ) : loadingTasks ? (
            <div className="py-20 text-center text-sm text-zinc-500">
              Loading tasks &amp; habits...
            </div>
          ) : (
            <TaskListView
              tasks={tasks}
              topics={queueTopics}
              today={today}
              isOwner={isOwner}
              onLogSession={handleLogTaskSession}
              onToggleTodo={handleToggleTaskTodo}
              onAddTodo={handleAddTaskTodo}
              onEditTask={(task) => {
                setEditingTask(task);
                setTaskModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onOpenCreateTask={() => {
                setEditingTask(null);
                setTaskModalOpen(true);
              }}
              onOpenTopic={openTopicPage}
              onSelectTaskInCalendar={(taskId) => {
                setSelectedCalendarTaskId(taskId);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </main>
      </div>

      {/* Task Create / Edit Modal */}
      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        task={editingTask}
        availableTopics={queueTopics}
        onSave={handleSaveTask}
        onCreateNewTopic={openNewNotePage}
      />

      {/* Delete Topic Confirmation Dialog */}
      <Dialog
        open={!!deleteTopicTarget}
        onOpenChange={(open) => !open && setDeleteTopicTarget(null)}
      >
        <DialogContent className="sm:max-w-[420px] bg-[#0f111a] border border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Topic</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Are you sure you want to permanently delete &ldquo;
              {deleteTopicTarget?.title}&rdquo;?
              This will remove its notes and attachments from storage. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTopicTarget(null)}
              disabled={isDeleting}
              className="text-xs border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="text-xs bg-red-600 hover:bg-red-500 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Topic'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auth Modal */}
      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={() => {
          setIsOwner(true);
          fetchQueue();
          fetchTasks();
          fetchActivity();
        }}
      />

      {/* About Modal */}
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  );
}
