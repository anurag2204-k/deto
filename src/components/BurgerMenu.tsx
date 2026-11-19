'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/ThemeProvider';
import {
  Menu,
  Sun,
  Moon,
  LogOut,
  LogIn,
  Info,
  Layers,
  Calendar,
  CheckSquare,
  Sparkles,
  ListTodo,
  Play,
} from 'lucide-react';

interface BurgerMenuProps {
  isOwner: boolean;
  onLogout: () => void;
  onOpenLogin: () => void;
  onOpenAbout: () => void;
  activeTab: 'queue' | 'due' | 'tasks' | 'todos';
  onSelectTab: (tab: 'queue' | 'due' | 'tasks' | 'todos') => void;
  pendingQueueCount: number;
  dueTopicsCount: number;
  pendingTasksCount: number;
  pendingTodosCount?: number;
}

export function BurgerMenu({
  isOwner,
  onLogout,
  onOpenLogin,
  onOpenAbout,
  activeTab,
  onSelectTab,
  pendingQueueCount,
  dueTopicsCount,
  pendingTasksCount,
  pendingTodosCount = 0,
}: BurgerMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        title="Open menu"
        className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100/70 hover:bg-slate-200/70 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
      >
        {isOwner ? (
          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
            A
          </div>
        ) : null}
        <Menu className="w-4 h-4 text-slate-600 dark:text-zinc-300" />
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[84vw] sm:w-[360px] bg-white dark:bg-[#0f111a] border-l border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white p-5 flex flex-col justify-between shadow-2xl z-50"
      >
        <div className="space-y-6">
          {/* Header */}
          <SheetHeader className="p-0 border-b border-slate-200/80 dark:border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 via-emerald-500/10 to-amber-500/20 border border-slate-200 dark:border-white/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-base shadow-xs">
                ∞
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-slate-900 dark:text-white leading-none">
                  Deto
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Personal Task &amp; Retention Tracker
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Account / User Section */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              Account
            </span>

            {isOwner ? (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center shadow-sm text-sm shrink-0">
                    A
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">anurag</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Verified Owner</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onLogout();
                    setOpen(false);
                  }}
                  className="h-8 px-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 gap-1.5 rounded-lg"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </Button>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-zinc-300">Public Visitor</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-500">Read-only access</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    onOpenLogin();
                  }}
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 rounded-lg shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Owner Login</span>
                </Button>
              </div>
            )}
          </div>

          {/* Theme Option (Light / Dark) */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              Appearance
            </span>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/5">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                  theme === 'dark'
                    ? 'bg-zinc-800 text-white shadow-xs border border-white/10'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>

          {/* Navigation Views */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
              Views
            </span>

            <button
              type="button"
              onClick={() => {
                onSelectTab('queue');
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'queue'
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-xs dark:bg-indigo-950/50 dark:border-indigo-500/30 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className={`w-4 h-4 ${activeTab === 'queue' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-400'}`} />
                <span>Queue</span>
              </div>
              {pendingQueueCount > 0 && (
                <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0">
                  {pendingQueueCount}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('due');
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'due'
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-xs dark:bg-indigo-950/50 dark:border-indigo-500/30 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className={`w-4 h-4 ${activeTab === 'due' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-400'}`} />
                <span>Due Revisions</span>
              </div>
              {dueTopicsCount > 0 && (
                <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0">
                  {dueTopicsCount}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('tasks');
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'tasks'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-xs dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckSquare className={`w-4 h-4 ${activeTab === 'tasks' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-400'}`} />
                <span>Tasks &amp; Habits</span>
              </div>
              {pendingTasksCount > 0 && (
                <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">
                  {pendingTasksCount}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('todos');
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'todos'
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-xs dark:bg-indigo-950/50 dark:border-indigo-500/30 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ListTodo className={`w-4 h-4 ${activeTab === 'todos' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-400'}`} />
                <span>To-Do Lists</span>
              </div>
              {pendingTodosCount > 0 && (
                <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0">
                  {pendingTodosCount}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push('/summarize');
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-md bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs shadow-rose-500/20 group-hover:scale-105 transition-transform">
                  <Play className="w-2 h-2 fill-current ml-0.5" />
                </div>
                <span>Summarize Video</span>
              </div>
              <Badge variant="outline" className="text-[9px] py-0 px-1 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 font-medium">
                AI
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenAbout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 transition-all"
            >
              <Info className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
              <span>About Deto</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Deto v0.1</span>
          </div>
          <span>Continuous FIFO &amp; Habit Sync</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
