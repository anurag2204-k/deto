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
import { TodoListView } from '@/components/TodoListView';
import { ActivityCalendar } from '@/components/ActivityCalendar';
import { AtmosphericBackdrop } from '@/components/AtmosphericBackdrop';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BurgerMenu } from '@/components/BurgerMenu';
import {
  ActivityMap,
  LightweightTopic,
  Task,
  RingColor,
  RingFrequency,
  TodoFolder,
  TodoItem,
} from '@/lib/types';
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
  getTodos,
  createTodoFolder,
  updateTodoFolder,
  deleteTodoFolder,
  createTodoItem,
  updateTodoItem,
  deleteTodoItem,
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
  ListTodo,
  Play,
  Sparkles,
  BookMarked,
  ExternalLink,
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
  const [activeTab, setActiveTab] = useState<'queue' | 'due' | 'tasks' | 'todos'>('queue');

  // Topics & Tasks
  const [queueTopics, setQueueTopics] = useState<LightweightTopic[]>([]);
  const [dueTopics, setDueTopics] = useState<LightweightTopic[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todoFolders, setTodoFolders] = useState<TodoFolder[]>([]);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [activityMap, setActivityMap] = useState<ActivityMap>({});

  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDue, setLoadingDue] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingTodos, setLoadingTodos] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dialogs
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedCalendarTaskId, setSelectedCalendarTaskId] = useState<string | null>(null);
  const [deleteTopicTarget, setDeleteTopicTarget] = useState<LightweightTopic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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

  const fetchTodos = useCallback(async () => {
    setLoadingTodos(true);
    try {
      const res = await getTodos();
      setTodoFolders(res.folders || []);
      setTodoItems(res.items || []);
    } catch (err) {
      console.error('Failed to load to-dos', err);
    } finally {
      setLoadingTodos(false);
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
    fetchTodos();
    fetchActivity();
  }, [checkAuth, fetchQueue, fetchTasks, fetchTodos, fetchActivity]);

  useEffect(() => {
    if (today) {
      fetchDue(today);
    }
  }, [today, fetchDue]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOwner(false);
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handleNotesLibraryClick = useCallback(() => {
    if (isOwner) {
      window.open('https://notesvercel-seven.vercel.app/', '_blank', 'noopener,noreferrer');
    } else {
      setPendingRedirect('https://notesvercel-seven.vercel.app/');
      setLoginNotice('Please log in to access the Notes Library.');
      setToastMessage('Please log in');
      setLoginOpen(true);
    }
  }, [isOwner]);

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

  // To-Do Actions
  const handleCreateTodoFolder = async (data: { name: string; parentId: string | null; color: string }) => {
    try {
      const created = await createTodoFolder(data);
      setTodoFolders((prev) => [...prev, created]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setIsOwner(false);
        setLoginOpen(true);
      }
      throw err;
    }
  };

  const handleUpdateTodoFolder = async (
    id: string,
    data: { name?: string; parentId?: string | null; color?: string }
  ) => {
    try {
      const updated = await updateTodoFolder(id, data);
      setTodoFolders((prev) => prev.map((f) => (f._id === id ? updated : f)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setIsOwner(false);
        setLoginOpen(true);
      }
      throw err;
    }
  };

  const handleDeleteTodoFolder = async (id: string) => {
    try {
      await deleteTodoFolder(id);
      setTodoFolders((prev) => prev.filter((f) => f._id !== id && f.parentId !== id));
      setTodoItems((prev) => prev.filter((i) => i.folderId !== id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setIsOwner(false);
        setLoginOpen(true);
      }
      throw err;
    }
  };

  const handleCreateTodoItem = async (data: { text: string; folderId: string | null; notes?: string }) => {
    try {
      const created = await createTodoItem(data);
      setTodoItems((prev) => [created, ...prev]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setIsOwner(false);
        setLoginOpen(true);
      }
      throw err;
    }
  };

  const handleUpdateTodoItem = async (
    id: string,
    data: Partial<{
      text: string;
      done: boolean;
      folderId: string | null;
      notes?: string;
      subtasks?: Array<{ id: string; text: string; done: boolean }>;
    }>
  ) => {
    setTodoItems((prev) => prev.map((i) => (i._id === id ? { ...i, ...data } : i)));
    try {
      const updated = await updateTodoItem(id, data);
      setTodoItems((prev) => prev.map((i) => (i._id === id ? updated : i)));
    } catch (err) {
      fetchTodos();
      if (err instanceof ApiError && err.status === 401) {
        setIsOwner(false);
        setLoginOpen(true);
      }
      throw err;
    }
  };

  const handleDeleteTodoItem = async (id: string) => {
    setTodoItems((prev) => prev.filter((i) => i._id !== id));
    try {
      await deleteTodoItem(id);
    } catch (err) {
      fetchTodos();
      if (err instanceof ApiError && err.status === 401) {
        setIsOwner(false);
        setLoginOpen(true);
      }
      throw err;
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
  const pendingTodosCount = todoItems.filter((i) => !i.done).length;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#090a10] text-slate-900 dark:text-[#f8fafc] transition-colors duration-200">
      {/* DESKTOP SIDEBAR NAVIGATION - Visible on desktop (lg: 1024px+); hidden on tablets (iPad Mini 768px) & mobile */}
      <aside className="hidden lg:flex flex-col justify-between w-64 h-screen sticky top-0 border-r border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-[#090a10]/80 backdrop-blur-xl p-6 shrink-0 z-20 transition-colors">
        <div>
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/15 via-emerald-500/10 to-amber-500/15 dark:from-indigo-500/20 dark:via-emerald-500/10 dark:to-amber-500/20 border border-slate-200 dark:border-white/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg shadow-sm">
              ∞
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Deto</span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'queue'
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-xs dark:bg-indigo-950/50 dark:border-indigo-500/30 dark:text-white dark:shadow-indigo-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className={`w-4 h-4 ${activeTab === 'queue' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-400'}`} />
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
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-xs dark:bg-indigo-950/50 dark:border-indigo-500/30 dark:text-white dark:shadow-indigo-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className={`w-4 h-4 ${activeTab === 'due' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-400'}`} />
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
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-xs dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-white dark:shadow-emerald-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckSquare className={`w-4 h-4 ${activeTab === 'tasks' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-400'}`} />
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
              onClick={() => setActiveTab('todos')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'todos'
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-xs dark:bg-indigo-950/50 dark:border-indigo-500/30 dark:text-white dark:shadow-indigo-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <ListTodo className={`w-4 h-4 ${activeTab === 'todos' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-400'}`} />
                <span>To-Dos</span>
              </div>
              {pendingTodosCount > 0 && (
                <Badge className="bg-indigo-600 text-white text-[11px] px-2 py-0 font-semibold shadow-xs">
                  {pendingTodosCount}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push('/summarize')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs shadow-rose-500/20 group-hover:scale-105 transition-transform">
                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                </div>
                <span>Summarize Video</span>
              </div>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 font-medium">
                AI
              </Badge>
            </button>

            <button
              type="button"
              onClick={handleNotesLibraryClick}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 group"
            >
              <div className="flex items-center gap-3">
                <BookMarked className="w-4 h-4 text-slate-400 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                <span>Notes Library</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300 transition-colors" />
            </button>

            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 transition-all"
            >
              <Info className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
              <span>About</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer - Theme Toggle + App Info pinned at bottom */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-500">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="truncate">Theme</span>
          </div>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">∞</span>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Mountain Atmosphere Graphic in Top Right */}
        <AtmosphericBackdrop />

        {/* Top Header / Profile Bar */}
        <header className="sticky top-0 z-30 px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between bg-white/70 dark:bg-[#090a10]/60 backdrop-blur-md border-b border-slate-200/80 dark:border-white/5 transition-colors">
          {/* Brand header on mobile & tablet */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/15 via-emerald-500/10 to-amber-500/15 dark:from-indigo-500/20 dark:via-emerald-500/10 dark:to-amber-500/20 border border-slate-200 dark:border-white/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shadow-xs">
              ∞
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">Deto</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-mono">
            {today && <span>{today}</span>}
          </div>

          {/* Right Header Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto">
            {/* Create Topic Button (Owner only) */}
            {isOwner && (
              <Button
                onClick={openNewNotePage}
                size="sm"
                variant="outline"
                className="h-8 px-2.5 sm:px-3 text-xs border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200 font-medium rounded-xl gap-1 active:scale-95 transition-transform"
                title="Create study notes / topic in queue"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span><span className="hidden sm:inline">New </span>Topic</span>
              </Button>
            )}

            {/* Create Task Button (Owner only) */}
            {isOwner && (
              <Button
                onClick={() => {
                  setEditingTask(null);
                  setTaskModalOpen(true);
                }}
                size="sm"
                className="h-8 px-2.5 sm:px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-600/20 rounded-xl gap-1 active:scale-95 transition-transform"
                title="Create scheduled task (Gym, habit, checklist)"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span><span className="hidden sm:inline">New </span>Task</span>
              </Button>
            )}

            {/* DESKTOP ONLY: Theme toggle & Profile pill (hidden on mobile/tablet) */}
            <div className="hidden lg:flex items-center gap-2.5">
              <ThemeToggle />

              {isOwner ? (
                <div className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-zinc-900/80">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    A
                  </div>
                  <span className="text-xs text-slate-700 dark:text-zinc-300 font-medium">anurag</span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLoginOpen(true)}
                  className="h-8 px-3 text-xs border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-lg gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Owner Login</span>
                </Button>
              )}
            </div>

            {/* MOBILE ONLY: Hamburger Menu (hidden on desktop screens lg: 1024px+) */}
            <div className="lg:hidden">
              <BurgerMenu
                isOwner={isOwner}
                onLogout={handleLogout}
                onOpenLogin={() => setLoginOpen(true)}
                onOpenAbout={() => setAboutOpen(true)}
                activeTab={activeTab}
                onSelectTab={setActiveTab}
                pendingQueueCount={pendingQueueCount}
                dueTopicsCount={dueTopics.length}
                pendingTasksCount={pendingTasksCount}
                pendingTodosCount={pendingTodosCount}
                onNotesLibraryClick={handleNotesLibraryClick}
              />
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-5 sm:py-8 max-w-6xl w-full mx-auto space-y-6 sm:space-y-8 z-10">
          {loadError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Database Connection Error</p>
                <p className="mt-0.5 leading-relaxed opacity-90">{loadError}</p>
              </div>
            </div>
          )}

          {/* Hero Typography Section */}
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Keep Moving,<br />Keep Evolving
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-zinc-400 max-w-xl">
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
          <div className="flex items-center gap-6 border-b border-slate-200 dark:border-white/10 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-2 pb-2 text-sm font-medium transition-all relative ${
                activeTab === 'queue'
                  ? 'text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Queue</span>
              {pendingQueueCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-semibold border border-indigo-500/20 dark:border-indigo-500/30">
                  {pendingQueueCount}
                </span>
              )}
              {activeTab === 'queue' && (
                <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_10px_#6366f1]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('due')}
              className={`flex items-center gap-2 pb-2 text-sm font-medium transition-all relative ${
                activeTab === 'due'
                  ? 'text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Due</span>
              {dueTopics.length > 0 && (
                <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0 ml-1">
                  {dueTopics.length}
                </Badge>
              )}
              {activeTab === 'due' && (
                <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_10px_#6366f1]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 pb-2 text-sm font-medium transition-all relative ${
                activeTab === 'tasks'
                  ? 'text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Tasks &amp; Habits</span>
              {pendingTasksCount > 0 && (
                <Badge className="bg-emerald-600 dark:bg-emerald-500 text-white text-[10px] px-1.5 py-0 ml-1">
                  {pendingTasksCount}
                </Badge>
              )}
              {activeTab === 'tasks' && (
                <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-500 shadow-[0_0_10px_#10b981]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('todos')}
              className={`flex items-center gap-2 pb-2 text-sm font-medium transition-all relative ${
                activeTab === 'todos'
                  ? 'text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <ListTodo className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>To-Dos</span>
              {pendingTodosCount > 0 && (
                <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0 ml-1">
                  {pendingTodosCount}
                </Badge>
              )}
              {activeTab === 'todos' && (
                <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_10px_#6366f1]" />
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
          ) : activeTab === 'tasks' ? (
            loadingTasks ? (
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
            )
          ) : loadingTodos ? (
            <div className="py-20 text-center text-sm text-zinc-500">
              Loading to-do lists...
            </div>
          ) : (
            <TodoListView
              folders={todoFolders}
              items={todoItems}
              isOwner={isOwner}
              onCreateFolder={handleCreateTodoFolder}
              onUpdateFolder={handleUpdateTodoFolder}
              onDeleteFolder={handleDeleteTodoFolder}
              onCreateItem={handleCreateTodoItem}
              onUpdateItem={handleUpdateTodoItem}
              onDeleteItem={handleDeleteTodoItem}
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
        <DialogContent className="sm:max-w-[420px] bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Delete Topic</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-zinc-400 text-xs">
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
              className="text-xs border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
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
        notice={loginNotice}
        onOpenChange={(open) => {
          setLoginOpen(open);
          if (!open) {
            setPendingRedirect(null);
            setLoginNotice(null);
          }
        }}
        onSuccess={() => {
          setIsOwner(true);
          fetchQueue();
          fetchTasks();
          fetchTodos();
          fetchActivity();
          if (pendingRedirect) {
            const redirectUrl = pendingRedirect;
            setPendingRedirect(null);
            setLoginNotice(null);
            window.location.href = redirectUrl;
          }
        }}
      />

      {/* About Modal */}
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-zinc-800 dark:text-zinc-100 shadow-2xl border border-slate-700 dark:border-white/10 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
