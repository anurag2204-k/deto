'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LoginDialog } from '@/components/LoginDialog';
import { AtmosphericBackdrop } from '@/components/AtmosphericBackdrop';
import { getMe, logout, getGymLogs, saveGymLog, deleteGymLog } from '@/lib/api';
import { GymLog, GymSet } from '@/lib/types';
import {
  GYM_SCHEDULE,
  GymExercise,
  GymDayPlan,
  getTodayDayKey,
} from '@/lib/gymData';
import {
  ArrowLeft,
  Dumbbell,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Check,
  Calendar,
  Flame,
  Info,
  LogIn,
  LogOut,
  TrendingUp,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';

export default function GymPage() {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string>('monday');
  const [todayDayKey, setTodayDayKey] = useState<string>('monday');
  const [currentDate, setCurrentDate] = useState<string>('');
  
  // Gym logs loaded from MongoDB
  const [logs, setLogs] = useState<GymLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [savingExerciseId, setSavingExerciseId] = useState<string | null>(null);
  const [saveSuccessMap, setSaveSuccessMap] = useState<Record<string, boolean>>({});

  // Active slots in memory being entered for each exercise
  const [draftSlots, setDraftSlots] = useState<Record<string, GymSet[]>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  // Collapsible state for exercise dropdowns (form guides & images)
  const [openGuides, setOpenGuides] = useState<Record<string, boolean>>({});

  // Rest Timer state
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerInitial, setTimerInitial] = useState<number>(90);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Check auth
  const checkAuth = useCallback(async () => {
    try {
      const res = await getMe();
      setIsOwner(res.isOwner);
    } catch {
      setIsOwner(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    const todayKey = getTodayDayKey();
    setTodayDayKey(todayKey);
    setSelectedDayId(todayKey);

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setCurrentDate(`${y}-${m}-${d}`);
  }, [checkAuth]);

  // Load logs from MongoDB
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await getGymLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load gym logs', err);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Group logs by exerciseId
  const logsByExercise = useMemo(() => {
    const map: Record<string, GymLog[]> = {};
    for (const log of logs) {
      if (!map[log.exerciseId]) {
        map[log.exerciseId] = [];
      }
      map[log.exerciseId].push(log);
    }
    // Sort each group descending by date
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => b.date.localeCompare(a.date));
    }
    return map;
  }, [logs]);

  // Get current active day plan
  const currentPlan = useMemo<GymDayPlan>(() => {
    return (
      GYM_SCHEDULE.find((d) => d.id === selectedDayId) || GYM_SCHEDULE[0]
    );
  }, [selectedDayId]);

  // Initialize draft slots for exercises if empty
  useEffect(() => {
    if (!currentPlan) return;
    setDraftSlots((prev) => {
      const updated = { ...prev };
      for (const ex of currentPlan.exercises) {
        if (!updated[ex.id]) {
          // Check if there's a log from today
          const todayLog = logsByExercise[ex.id]?.find((l) => l.date === currentDate);
          if (todayLog && todayLog.slots.length > 0) {
            updated[ex.id] = todayLog.slots.map((s) => ({ ...s }));
          } else {
            // Check previous session to prefill weights/reps placeholder
            const prevLog = logsByExercise[ex.id]?.[0];
            const defaultSetCount = ex.defaultSets || 3;
            const newSets: GymSet[] = [];
            for (let i = 1; i <= defaultSetCount; i++) {
              const prevSet = prevLog?.slots?.[i - 1];
              newSets.push({
                setNumber: i,
                weight: prevSet?.weight ?? 0,
                reps: prevSet?.reps ?? (ex.id.includes('squat') ? 8 : 10),
                completed: true,
              });
            }
            updated[ex.id] = newSets;
          }
        }
      }
      return updated;
    });
  }, [currentPlan, logsByExercise, currentDate]);

  // Rest Timer ticking
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerSeconds]);

  const startTimer = (seconds: number) => {
    setTimerInitial(seconds);
    setTimerSeconds(seconds);
    setTimerRunning(true);
  };

  const toggleTimer = () => {
    if (timerSeconds === 0) {
      setTimerSeconds(timerInitial);
      setTimerRunning(true);
    } else {
      setTimerRunning((prev) => !prev);
    }
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(timerInitial);
  };

  // Toggle guide/image dropdown for exercise
  const toggleGuide = (exerciseId: string) => {
    setOpenGuides((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };

  // Slot handlers
  const handleSetChange = (
    exerciseId: string,
    setIndex: number,
    field: 'weight' | 'reps',
    value: number
  ) => {
    setDraftSlots((prev) => {
      const exerciseSets = [...(prev[exerciseId] || [])];
      if (!exerciseSets[setIndex]) return prev;
      exerciseSets[setIndex] = {
        ...exerciseSets[setIndex],
        [field]: Math.max(0, value),
      };
      return {
        ...prev,
        [exerciseId]: exerciseSets,
      };
    });
  };

  const handleAddSet = (exerciseId: string) => {
    setDraftSlots((prev) => {
      const exerciseSets = [...(prev[exerciseId] || [])];
      const lastSet = exerciseSets[exerciseSets.length - 1];
      const nextNum = exerciseSets.length + 1;
      exerciseSets.push({
        setNumber: nextNum,
        weight: lastSet ? lastSet.weight : 0,
        reps: lastSet ? lastSet.reps : 10,
        completed: true,
      });
      return {
        ...prev,
        [exerciseId]: exerciseSets,
      };
    });
  };

  const handleRemoveSet = (exerciseId: string, setIndex: number) => {
    setDraftSlots((prev) => {
      const exerciseSets = [...(prev[exerciseId] || [])];
      exerciseSets.splice(setIndex, 1);
      const renumbered = exerciseSets.map((s, idx) => ({
        ...s,
        setNumber: idx + 1,
      }));
      return {
        ...prev,
        [exerciseId]: renumbered,
      };
    });
  };

  const handleSaveSlot = async (exercise: GymExercise) => {
    if (!isOwner) {
      setLoginOpen(true);
      return;
    }

    const setsToSave = draftSlots[exercise.id] || [];
    if (setsToSave.length === 0) return;

    setSavingExerciseId(exercise.id);
    try {
      const saved = await saveGymLog({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        dayKey: selectedDayId,
        date: currentDate || new Date().toISOString().slice(0, 10),
        slots: setsToSave,
        notes: draftNotes[exercise.id],
      });

      // Update local logs list
      setLogs((prev) => {
        const filtered = prev.filter(
          (l) => !(l.exerciseId === saved.exerciseId && l.date === saved.date)
        );
        return [saved, ...filtered];
      });

      setSaveSuccessMap((prev) => ({ ...prev, [exercise.id]: true }));
      setTimeout(() => {
        setSaveSuccessMap((prev) => ({ ...prev, [exercise.id]: false }));
      }, 3000);
    } catch (err) {
      console.error('Failed to save exercise slot', err);
      alert(err instanceof Error ? err.message : 'Failed to save slot');
    } finally {
      setSavingExerciseId(null);
    }
  };

  const handleDeleteSlot = async (logId: string) => {
    if (!isOwner) {
      setLoginOpen(true);
      return;
    }
    if (!confirm('Are you sure you want to delete this recorded session?')) return;

    try {
      await deleteGymLog(logId);
      setLogs((prev) => prev.filter((l) => l._id !== logId));
    } catch (err) {
      console.error('Failed to delete gym log', err);
      alert('Failed to delete slot');
    }
  };

  const handleCopyPreviousSession = (exerciseId: string) => {
    const prevLog = logsByExercise[exerciseId]?.[0];
    if (!prevLog || prevLog.slots.length === 0) {
      alert('No previous session found for this exercise.');
      return;
    }
    setDraftSlots((prev) => ({
      ...prev,
      [exerciseId]: prevLog.slots.map((s, idx) => ({
        setNumber: idx + 1,
        weight: s.weight,
        reps: s.reps,
        completed: true,
      })),
    }));
  };

  // Compute total working sets completed today for the active workout
  const totalSetsLoggedToday = useMemo(() => {
    let count = 0;
    for (const ex of currentPlan.exercises) {
      const todayLog = logsByExercise[ex.id]?.find((l) => l.date === currentDate);
      if (todayLog) {
        count += todayLog.slots.length;
      }
    }
    return count;
  }, [currentPlan, logsByExercise, currentDate]);

  const totalTargetSets = useMemo(() => {
    return currentPlan.exercises.reduce((acc, ex) => acc + (ex.defaultSets || 3), 0);
  }, [currentPlan]);

  const completionPercent = useMemo(() => {
    if (totalTargetSets === 0) return 0;
    return Math.min(100, Math.round((totalSetsLoggedToday / totalTargetSets) * 100));
  }, [totalSetsLoggedToday, totalTargetSets]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090a10] text-slate-900 dark:text-zinc-100 flex flex-col transition-colors selection:bg-indigo-500/20 selection:text-indigo-400">
      <AtmosphericBackdrop />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-[#090a10]/80 backdrop-blur-xl px-4 sm:px-6 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="gap-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Deto</span>
            </Button>
            <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Dumbbell className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                Gym PPL Tracker
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0 hidden md:inline-flex"
              >
                6-Day Split
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            {isOwner === false ? (
              <Button
                size="sm"
                onClick={() => setLoginOpen(true)}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 rounded-xl shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Owner Login</span>
              </Button>
            ) : isOwner === true ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await logout();
                  setIsOwner(false);
                }}
                className="h-8 text-xs text-slate-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 gap-1 rounded-xl"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 z-10">
        {/* Day Selector Pill Tabs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              Weekly PPL Split (Push / Pull / Legs)
            </span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Today: <strong className="text-indigo-600 dark:text-indigo-400 capitalize">{todayDayKey}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {GYM_SCHEDULE.map((day) => {
              const isSelected = selectedDayId === day.id;
              const isToday = todayDayKey === day.id;

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDayId(day.id)}
                  className={`relative p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-900 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                      : 'bg-white/60 dark:bg-zinc-900/40 border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:bg-white dark:hover:bg-zinc-900/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {day.dayName}
                    </span>
                    {isToday && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Today" />
                    )}
                  </div>
                  <p className="text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
                    {day.title}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-1">
                    {day.focus}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Header Banner & Rest Timer */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-zinc-900/60 p-5 sm:p-7 backdrop-blur-xl shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-indigo-600 text-white text-xs font-semibold px-2.5 py-0.5">
                  {currentPlan.dayName} • {currentPlan.title}
                </Badge>
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  Target: {currentPlan.targetSets}
                </span>
                {todayDayKey === currentPlan.id && (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                    Active Today
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {currentPlan.focus}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                {currentPlan.restGuideline}
              </p>
            </div>

            {/* Rest Timer Widget */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-black/40 p-4 shrink-0 flex flex-col items-center sm:items-end gap-2.5 min-w-[240px]">
              <div className="w-full flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-zinc-400">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Rest Timer</span>
                </div>
                <div className="flex items-center gap-1">
                  {[60, 90, 120, 150].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => startTimer(s)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all ${
                        timerInitial === s
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200/70 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                      }`}
                    >
                      {s >= 60 ? `${s / 60}m` : `${s}s`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full flex items-center justify-between gap-3 pt-1">
                <div className="text-2xl font-mono font-bold tracking-tight text-slate-900 dark:text-white">
                  {Math.floor(timerSeconds / 60)}:
                  {String(timerSeconds % 60).padStart(2, '0')}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={timerRunning ? 'outline' : 'default'}
                    onClick={toggleTimer}
                    className={`h-8 px-3 rounded-xl text-xs gap-1 font-semibold ${
                      timerRunning
                        ? 'border-amber-500/30 text-amber-600 dark:text-amber-400'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{timerRunning ? 'Pause' : timerSeconds > 0 ? 'Resume' : 'Start'}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={resetTimer}
                    className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar for working sets */}
          {currentPlan.exercises.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-zinc-400">
                  Today&apos;s Workout Completion ({currentDate})
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {totalSetsLoggedToday} / {totalTargetSets} working sets logged ({completionPercent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-amber-500 transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sunday Rest & Recovery Special Card */}
        {currentPlan.id === 'sunday' && (
          <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-white to-white dark:from-emerald-950/20 dark:via-zinc-900/60 dark:to-zinc-900/60 p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Active Recovery &amp; Systemic Deload
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Allow your central nervous system, tendons, and connective tissues to repair and adapt.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentPlan.recoveryTips?.map((tip, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-900/80 flex items-start gap-3 shadow-2xs"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    {idx + 1}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                    {tip}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercises List */}
        {currentPlan.exercises.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Exercises in {currentPlan.title}</span>
                <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">
                  ({currentPlan.exercises.length} movements)
                </span>
              </h2>
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                Click form guide to view demonstration image &amp; cues
              </span>
            </div>

            <div className="space-y-5">
              {currentPlan.exercises.map((exercise, index) => {
                const exerciseLogs = logsByExercise[exercise.id] || [];
                const currentSets = draftSlots[exercise.id] || [];
                const isGuideOpen = Boolean(openGuides[exercise.id]);
                const isSaving = savingExerciseId === exercise.id;
                const isSuccess = Boolean(saveSuccessMap[exercise.id]);

                return (
                  <div
                    key={exercise.id}
                    className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-900/70 p-5 sm:p-6 backdrop-blur-xl shadow-xs transition-all hover:border-slate-300 dark:hover:border-white/15 space-y-5"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-400 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                            {exercise.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30"
                          >
                            {exercise.category}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                          >
                            Target: {exercise.target}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                          {exercise.setsReps}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGuide(exercise.id)}
                          className="h-8 text-xs gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                          <Dumbbell className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{isGuideOpen ? 'Hide Form Guide' : 'Form Guide & Image'}</span>
                          {isGuideOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Execution Cue Bar */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/5 flex items-start gap-2.5 text-xs text-slate-600 dark:text-zinc-300">
                      <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white font-medium">Execution Cue: </strong>
                        <span>{exercise.executionCue}</span>
                        {exercise.alternative && (
                          <span className="block mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                            Alternative: <strong className="text-indigo-600 dark:text-indigo-400">{exercise.alternative}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Dropdown: Exercise Image & Demonstration Guide */}
                    {isGuideOpen && (
                      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:via-zinc-950/60 dark:to-zinc-950/60 p-4 sm:p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex flex-col md:flex-row items-center gap-5">
                          {/* Image preview */}
                          <div className="relative w-full md:w-64 h-44 rounded-2xl overflow-hidden bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 shrink-0 shadow-sm group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={exercise.imageUrl}
                              alt={exercise.name}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                // Fallback placeholder if image load fails
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5">
                              <span className="text-[11px] font-medium text-white truncate">
                                {exercise.name} Demonstration
                              </span>
                            </div>
                          </div>

                          {/* Technique and Muscle Activation Guide */}
                          <div className="space-y-2.5 flex-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                                Movement Mechanics
                              </span>
                              <Badge className="bg-indigo-600 text-white text-[10px] py-0">
                                Rest: {exercise.restTime}
                              </Badge>
                            </div>

                            <p className="text-slate-600 dark:text-zinc-300 leading-relaxed">
                              {exercise.executionCue}
                            </p>

                            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                              <div className="p-2 rounded-xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-white/5">
                                <span className="text-slate-400 dark:text-zinc-500 block">Primary Target</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{exercise.target}</span>
                              </div>
                              <div className="p-2 rounded-xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-white/5">
                                <span className="text-slate-400 dark:text-zinc-500 block">Volume Blueprint</span>
                                <span className="font-bold text-slate-800 dark:text-zinc-200">{exercise.setsReps}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Slots / Sets Logging Form */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-500" />
                          <span>Current Slots ({currentDate})</span>
                        </span>

                        <div className="flex items-center gap-2">
                          {exerciseLogs.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyPreviousSession(exercise.id)}
                              className="h-7 text-[11px] gap-1 text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400"
                              title="Copy weights & reps from your last session"
                            >
                              <Copy className="w-3 h-3" />
                              <span className="hidden sm:inline">Copy Last Session</span>
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddSet(exercise.id)}
                            className="h-7 text-[11px] gap-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Set</span>
                          </Button>
                        </div>
                      </div>

                      {/* Sets grid */}
                      <div className="space-y-2">
                        {currentSets.map((set, setIdx) => (
                          <div
                            key={setIdx}
                            className="flex items-center gap-2.5 p-2 rounded-2xl bg-slate-50/70 dark:bg-black/30 border border-slate-200/80 dark:border-white/5"
                          >
                            <span className="w-6 text-center text-xs font-bold text-slate-500 dark:text-zinc-400 shrink-0">
                              #{set.setNumber}
                            </span>

                            <div className="flex items-center gap-1.5 flex-1">
                              <label className="text-[11px] text-slate-400 dark:text-zinc-500 shrink-0">
                                Weight:
                              </label>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                value={set.weight === 0 ? '' : set.weight}
                                onChange={(e) =>
                                  handleSetChange(
                                    exercise.id,
                                    setIdx,
                                    'weight',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder="0"
                                className="h-8 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                              />
                              <span className="text-xs text-slate-400 dark:text-zinc-500 shrink-0">kg</span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-1">
                              <label className="text-[11px] text-slate-400 dark:text-zinc-500 shrink-0">
                                Reps:
                              </label>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                value={set.reps === 0 ? '' : set.reps}
                                onChange={(e) =>
                                  handleSetChange(
                                    exercise.id,
                                    setIdx,
                                    'reps',
                                    parseInt(e.target.value, 10) || 0
                                  )
                                }
                                placeholder="0"
                                className="h-8 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                              />
                            </div>

                            {currentSets.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveSet(exercise.id, setIdx)}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 rounded-lg shrink-0"
                                title="Remove set"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Save button & success status */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                          {isSuccess && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              Slot saved to MongoDB!
                            </span>
                          )}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSaveSlot(exercise)}
                          disabled={isSaving}
                          className="h-8 px-4 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm gap-1.5"
                        >
                          {isSaving ? (
                            <span>Saving...</span>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Save Slot</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Previous Logged Slots History */}
                    {exerciseLogs.length > 0 && (
                      <div className="pt-3 border-t border-slate-200/80 dark:border-white/5 space-y-2">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                          Recent History ({exerciseLogs.length} recorded session{exerciseLogs.length > 1 ? 's' : ''})
                        </span>

                        <div className="space-y-2">
                          {exerciseLogs.slice(0, 3).map((log) => {
                            const totalVolume = log.slots.reduce(
                              (sum, s) => sum + s.weight * s.reps,
                              0
                            );

                            return (
                              <div
                                key={log._id}
                                className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-indigo-500" />
                                      {log.date}
                                    </span>
                                    <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                                      Volume: <strong className="text-emerald-600 dark:text-emerald-400">{totalVolume.toLocaleString()} kg</strong>
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {log.slots.map((s) => (
                                      <span
                                        key={s.setNumber}
                                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/5 text-[11px] font-mono text-slate-800 dark:text-zinc-200"
                                      >
                                        #{s.setNumber}: {s.weight}kg × {s.reps}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {isOwner && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSlot(log._id)}
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-500 shrink-0 self-end sm:self-center"
                                    title="Delete session"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Auth Dialog */}
      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={() => {
          setIsOwner(true);
          fetchLogs();
        }}
      />
    </div>
  );
}
