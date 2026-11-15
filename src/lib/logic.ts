import { ActivityMap, INTERVAL_DAYS, RingColor, RingFrequency, RingSettings, TopicRevision } from './types';

export const RING_COLORS: Record<
  RingColor,
  {
    name: string;
    hex: string;
    glow: string;
    border: string;
    bgSubtle: string;
    bgWeekAchieved: string;
    text: string;
  }
> = {
  emerald: {
    name: 'Emerald (Gym / Health)',
    hex: '#10b981',
    glow: 'rgba(16, 185, 129, 0.45)',
    border: '#34d399',
    bgSubtle: 'rgba(16, 185, 129, 0.15)',
    bgWeekAchieved: 'rgba(16, 185, 129, 0.25)',
    text: '#6ee7b7',
  },
  amber: {
    name: 'Amber (Habit / Focus)',
    hex: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.45)',
    border: '#fbbf24',
    bgSubtle: 'rgba(245, 158, 11, 0.15)',
    bgWeekAchieved: 'rgba(245, 158, 11, 0.25)',
    text: '#fcd34d',
  },
  indigo: {
    name: 'Indigo (Deep Work / Code)',
    hex: '#6366f1',
    glow: 'rgba(99, 102, 241, 0.45)',
    border: '#818cf8',
    bgSubtle: 'rgba(99, 102, 241, 0.15)',
    bgWeekAchieved: 'rgba(99, 102, 241, 0.25)',
    text: '#a5b4fc',
  },
  rose: {
    name: 'Rose (Cardio / High Energy)',
    hex: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.45)',
    border: '#fb7185',
    bgSubtle: 'rgba(244, 63, 94, 0.15)',
    bgWeekAchieved: 'rgba(244, 63, 94, 0.25)',
    text: '#fda4af',
  },
  cyan: {
    name: 'Cyan (Reading / Mind)',
    hex: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.45)',
    border: '#22d3ee',
    bgSubtle: 'rgba(6, 182, 212, 0.15)',
    bgWeekAchieved: 'rgba(6, 182, 212, 0.25)',
    text: '#67e8f9',
  },
  violet: {
    name: 'Violet (Creativity / Craft)',
    hex: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.45)',
    border: '#a78bfa',
    bgSubtle: 'rgba(139, 92, 246, 0.15)',
    bgWeekAchieved: 'rgba(139, 92, 246, 0.25)',
    text: '#c4b5fd',
  },
};

export interface RingGoalInfo {
  targetDays: number;
  period: 'week' | 'month';
  label: string;
  isDaily: boolean;
}

export function getRingGoal(ring?: RingSettings): RingGoalInfo {
  if (!ring) {
    return { targetDays: 1, period: 'week', label: '1 day a week', isDaily: false };
  }

  if (ring.frequency === 'custom' && ring.targetDays && ring.targetPeriod) {
    return {
      targetDays: ring.targetDays,
      period: ring.targetPeriod,
      label: `At least ${ring.targetDays} days / ${ring.targetPeriod}`,
      isDaily: ring.targetPeriod === 'week' && ring.targetDays >= 7,
    };
  }

  switch (ring.frequency) {
    case 'daily':
      return { targetDays: 7, period: 'week', label: 'Daily (7 days / week)', isDaily: true };
    case '4x-week':
      return { targetDays: 4, period: 'week', label: 'At least 4 days / week', isDaily: false };
    case '3x-week':
      return { targetDays: 3, period: 'week', label: 'At least 3 days / week', isDaily: false };
    case '2x-week':
      return { targetDays: 2, period: 'week', label: 'At least 2 days / week', isDaily: false };
    case '1x-week':
    case 'weekly':
      return { targetDays: 1, period: 'week', label: 'At least 1 day / week', isDaily: false };
    case '5x-week':
      return { targetDays: 5, period: 'week', label: 'At least 5 days / week', isDaily: false };
    case '6x-week':
      return { targetDays: 6, period: 'week', label: 'At least 6 days / week', isDaily: false };
    case 'every-2-days':
      return { targetDays: 4, period: 'week', label: 'Every 2 days (~4 days / week)', isDaily: false };
    case '10x-month':
      return { targetDays: 10, period: 'month', label: 'At least 10 days / month', isDaily: false };
    case '15x-month':
      return { targetDays: 15, period: 'month', label: 'At least 15 days / month', isDaily: false };
    case '20x-month':
      return { targetDays: 20, period: 'month', label: 'At least 20 days / month', isDaily: false };
    default:
      return { targetDays: 1, period: 'week', label: 'Active Cadence', isDaily: false };
  }
}

export function addDaysToDate(dateStr: string, days: number): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);

  const utcDate = new Date(Date.UTC(year, month, day + days));
  const y = utcDate.getUTCFullYear();
  const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcDate.getUTCDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

export function computeInitialRevision(studiedOn: string): TopicRevision {
  return {
    stage: 0,
    nextDueAt: addDaysToDate(studiedOn, INTERVAL_DAYS[0]),
  };
}

export function computeNextRevision(currentStage: number, today: string): TopicRevision {
  const nextStage = currentStage + 1;
  const intervalIndex = Math.min(nextStage, INTERVAL_DAYS.length - 1);
  const intervalDays = INTERVAL_DAYS[intervalIndex];

  return {
    stage: nextStage,
    nextDueAt: addDaysToDate(today, intervalDays),
  };
}

export function computeInitialQueuePos(maxQueuePos: number | null | undefined): number {
  if (maxQueuePos == null || isNaN(maxQueuePos)) {
    return 1000;
  }
  return maxQueuePos + 1000;
}

export function computeQueueDonePos(maxQueuePos: number): number {
  return maxQueuePos + 1000;
}

export function calculateNewQueuePos(
  prevPos: number | null,
  nextPos: number | null
): { newPos: number; needsRebalance: boolean } {
  if (prevPos === null && nextPos === null) {
    return { newPos: 1000, needsRebalance: false };
  }

  if (prevPos === null && nextPos !== null) {
    return { newPos: nextPos - 1000, needsRebalance: false };
  }

  if (prevPos !== null && nextPos === null) {
    return { newPos: prevPos + 1000, needsRebalance: false };
  }

  // Both present
  const prev = prevPos as number;
  const next = nextPos as number;
  const gap = Math.abs(next - prev);
  const needsRebalance = gap < 1e-6;

  return {
    newPos: (prev + next) / 2,
    needsRebalance,
  };
}

export function calculateOverdueDays(nextDueAt: string, today: string): number {
  const parse = (str: string) => {
    const [y, m, d] = str.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parse(today) - parse(nextDueAt)) / msPerDay);
}

export function formatOverdueLabel(nextDueAt: string, today: string): string {
  const days = calculateOverdueDays(nextDueAt, today);
  if (days <= 0) {
    return 'due today';
  }
  if (days === 1) {
    return '1 day overdue';
  }
  return `${days} days overdue`;
}

export function getFrequencyDays(frequency: RingFrequency): number {
  switch (frequency) {
    case 'daily':
    case '6x-week':
      return 1;
    case 'every-2-days':
    case '4x-week':
    case '5x-week':
    case '15x-month':
    case '20x-month':
      return 2;
    case '3x-week':
    case '10x-month':
      return 3;
    case '2x-week':
      return 4;
    case '1x-week':
    case 'weekly':
      return 7;
    default:
      return 2;
  }
}

export function formatRingCadence(ring?: RingSettings | RingFrequency): string {
  if (!ring) return 'Active Cadence';
  if (typeof ring === 'string') {
    return getRingGoal({ active: true, frequency: ring }).label;
  }
  return getRingGoal(ring).label;
}

export interface RingStatusResult {
  status: 'closed-today' | 'due-today' | 'overdue' | 'not-started';
  daysSinceLast: number;
  cadenceDays: number;
  progressPercent: number; // 0 - 100 for the SVG ring
  reminderText: string;
}

export function computeRingStatus(
  ring: RingSettings | undefined,
  today: string
): RingStatusResult {
  if (!ring || !ring.active) {
    return {
      status: 'not-started',
      daysSinceLast: 0,
      cadenceDays: 1,
      progressPercent: 0,
      reminderText: 'Not in active study ring',
    };
  }

  const cadenceDays = getFrequencyDays(ring.frequency);

  if (!ring.lastStudiedAt) {
    return {
      status: 'due-today',
      daysSinceLast: 0,
      cadenceDays,
      progressPercent: 0,
      reminderText: 'In ring! Ready for your first study session.',
    };
  }

  const parse = (str: string) => {
    const [y, m, d] = str.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceLast = Math.round((parse(today) - parse(ring.lastStudiedAt)) / msPerDay);

  if (daysSinceLast <= 0) {
    return {
      status: 'closed-today',
      daysSinceLast: 0,
      cadenceDays,
      progressPercent: 100,
      reminderText: 'Ring closed for today! Great work.',
    };
  }

  if (daysSinceLast < cadenceDays) {
    const progress = Math.max(10, Math.round((1 - daysSinceLast / cadenceDays) * 100));
    return {
      status: 'closed-today',
      daysSinceLast,
      cadenceDays,
      progressPercent: progress,
      reminderText: `On track! Last session ${daysSinceLast} day${daysSinceLast === 1 ? '' : 's'} ago.`,
    };
  }

  if (daysSinceLast === cadenceDays) {
    return {
      status: 'due-today',
      daysSinceLast,
      cadenceDays,
      progressPercent: 50,
      reminderText: 'Due today! Keep your active study cadence alive.',
    };
  }

  const overdueBy = daysSinceLast - cadenceDays;
  return {
    status: 'overdue',
    daysSinceLast,
    cadenceDays,
    progressPercent: 20,
    reminderText: `Not done yet! Overdue by ${overdueBy} day${overdueBy === 1 ? '' : 's'} — pick up where you left off.`,
  };
}

export interface CalendarDayInfo {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  isFuture: boolean;
  isToday: boolean;
  hasQueue: boolean;
  hasRing: boolean;
  hasBoth: boolean;
  totalCount: number;
}

export interface CalendarWeek {
  days: (CalendarDayInfo | null)[];
  monthLabel?: string;
}

export function generateCalendarWeeks(
  todayStr: string,
  weeksCount: number = 22,
  activityMap: ActivityMap = {}
): CalendarWeek[] {
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const todayUtc = new Date(Date.UTC(ty, tm - 1, td));
  const todayDayOfWeek = todayUtc.getUTCDay(); // 0 is Sunday

  // End on current week's Saturday
  const daysUntilSaturday = 6 - todayDayOfWeek;
  const endDateUtc = new Date(Date.UTC(ty, tm - 1, td + daysUntilSaturday));

  const totalDays = weeksCount * 7;
  const startDateUtc = new Date(
    Date.UTC(
      endDateUtc.getUTCFullYear(),
      endDateUtc.getUTCMonth(),
      endDateUtc.getUTCDate() - totalDays + 1
    )
  );

  const weeks: CalendarWeek[] = [];
  let currentWeek: (CalendarDayInfo | null)[] = [];
  let lastSeenMonth = -1;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(
      Date.UTC(
        startDateUtc.getUTCFullYear(),
        startDateUtc.getUTCMonth(),
        startDateUtc.getUTCDate() + i
      )
    );

    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dayNum}`;

    const isFuture = dateStr > todayStr;
    const isToday = dateStr === todayStr;
    const act = activityMap[dateStr];
    const hasQueue = Boolean(act?.queue);
    const hasRing = Boolean(act?.ring);
    const hasBoth = hasQueue && hasRing;
    const totalCount = act?.count || (hasQueue ? 1 : 0) + (hasRing ? 1 : 0);

    const dayInfo: CalendarDayInfo = {
      date: dateStr,
      dayOfWeek: d.getUTCDay(),
      isFuture,
      isToday,
      hasQueue,
      hasRing,
      hasBoth,
      totalCount,
    };

    currentWeek.push(dayInfo);

    if (currentWeek.length === 7) {
      const firstOfMonthDay = currentWeek.find((dw) => dw && Number(dw.date.split('-')[2]) <= 7);
      let monthLabel = undefined;
      if (firstOfMonthDay) {
        const monthIndex = Number(firstOfMonthDay.date.split('-')[1]) - 1;
        if (monthIndex !== lastSeenMonth) {
          const monthNames = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
          ];
          monthLabel = monthNames[monthIndex];
          lastSeenMonth = monthIndex;
        }
      }

      weeks.push({ days: currentWeek, monthLabel });
      currentWeek = [];
    }
  }

  return weeks;
}

export function calculateStudyStreak(
  activityMap: ActivityMap,
  todayStr: string
): { currentStreak: number; totalActiveDays: number } {
  const dates = Object.keys(activityMap).filter(
    (d) => activityMap[d]?.queue || activityMap[d]?.ring
  );
  const totalActiveDays = dates.length;

  if (totalActiveDays === 0) {
    return { currentStreak: 0, totalActiveDays: 0 };
  }

  const [ty, tm, td] = todayStr.split('-').map(Number);
  const todayUtc = new Date(Date.UTC(ty, tm - 1, td));

  const msPerDay = 24 * 60 * 60 * 1000;
  const isActivityOnDate = (dateStr: string) => {
    return Boolean(activityMap[dateStr]?.queue || activityMap[dateStr]?.ring);
  };

  const getStr = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  let streak = 0;
  let checkDate = new Date(todayUtc);

  if (isActivityOnDate(todayStr)) {
    streak++;
    checkDate = new Date(todayUtc.getTime() - msPerDay);
  } else {
    const yesterday = new Date(todayUtc.getTime() - msPerDay);
    if (!isActivityOnDate(getStr(yesterday))) {
      return { currentStreak: 0, totalActiveDays };
    }
    checkDate = yesterday;
  }

  while (true) {
    const dateStr = getStr(checkDate);
    if (isActivityOnDate(dateStr)) {
      if (dateStr !== todayStr) streak++;
      checkDate = new Date(checkDate.getTime() - msPerDay);
    } else {
      break;
    }
  }

  return { currentStreak: streak, totalActiveDays };
}

export interface TaskCalendarDayInfo {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  isFuture: boolean;
  isToday: boolean;
  hasSession: boolean;
  weekGoalAchieved: boolean;
}

export interface TaskCalendarWeek {
  days: (TaskCalendarDayInfo | null)[];
  isGoalAchieved: boolean;
  completedCount: number;
  targetDays: number;
  monthLabel?: string;
  monthString: string;
}

export function generateTaskCalendarWeeks(
  todayStr: string,
  weeksCount: number = 24,
  history: string[] = [],
  goal: { targetDays: number; period: 'week' | 'month' } = { targetDays: 4, period: 'week' }
): TaskCalendarWeek[] {
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const todayUtc = new Date(Date.UTC(ty, tm - 1, td));
  const todayDayOfWeek = todayUtc.getUTCDay(); // 0 is Sunday

  // End on current week's Saturday
  const daysUntilSaturday = 6 - todayDayOfWeek;
  const endDateUtc = new Date(Date.UTC(ty, tm - 1, td + daysUntilSaturday));

  const totalDays = weeksCount * 7;
  const startDateUtc = new Date(
    Date.UTC(
      endDateUtc.getUTCFullYear(),
      endDateUtc.getUTCMonth(),
      endDateUtc.getUTCDate() - totalDays + 1
    )
  );

  const historySet = new Set(history);

  // Precompute monthly counts for month-based goals
  const monthCounts: Record<string, number> = {};
  for (const date of history) {
    const monthKey = date.slice(0, 7); // YYYY-MM
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
  }

  const weeks: TaskCalendarWeek[] = [];
  let currentWeek: (TaskCalendarDayInfo | null)[] = [];
  let lastSeenMonth = -1;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(
      Date.UTC(
        startDateUtc.getUTCFullYear(),
        startDateUtc.getUTCMonth(),
        startDateUtc.getUTCDate() + i
      )
    );

    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dayNum}`;

    const isFuture = dateStr > todayStr;
    const isToday = dateStr === todayStr;
    const hasSession = historySet.has(dateStr);

    currentWeek.push({
      date: dateStr,
      dayOfWeek: d.getUTCDay(),
      isFuture,
      isToday,
      hasSession,
      weekGoalAchieved: false, // will update below
    });

    if (currentWeek.length === 7) {
      const validDays = currentWeek.filter(
        (day): day is TaskCalendarDayInfo => day !== null
      );
      const weekCompletedCount = validDays.filter((dw) => dw.hasSession).length;
      const midDay = validDays[3] || validDays[0];
      const monthStr = midDay ? midDay.date.slice(0, 7) : `${y}-${m}`;

      let isGoalAchieved = false;
      if (goal.period === 'week') {
        isGoalAchieved = weekCompletedCount >= goal.targetDays;
      } else {
        isGoalAchieved = (monthCounts[monthStr] || 0) >= goal.targetDays;
      }

      // Propagate achievement flag to all days in this week
      for (const dw of validDays) {
        dw.weekGoalAchieved = isGoalAchieved;
      }

      const firstOfMonthDay = currentWeek.find((dw) => dw && Number(dw.date.split('-')[2]) <= 7);
      let monthLabel = undefined;
      if (firstOfMonthDay) {
        const monthIndex = Number(firstOfMonthDay.date.split('-')[1]) - 1;
        if (monthIndex !== lastSeenMonth) {
          const monthNames = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
          ];
          monthLabel = monthNames[monthIndex];
          lastSeenMonth = monthIndex;
        }
      }

      weeks.push({
        days: currentWeek,
        isGoalAchieved,
        completedCount: weekCompletedCount,
        targetDays: goal.targetDays,
        monthLabel,
        monthString: monthStr,
      });

      currentWeek = [];
    }
  }

  return weeks;
}

export function calculateTaskStreak(
  history: string[] = [],
  todayStr: string,
  goal: { targetDays: number; period: 'week' | 'month' } = { targetDays: 4, period: 'week' }
): {
  totalSessions: number;
  thisWeekSessions: number;
  isThisWeekAchieved: boolean;
  currentStreak: number;
  achievedWeeksCount: number;
} {
  const historySet = new Set(history);
  const totalSessions = historySet.size;

  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      thisWeekSessions: 0,
      isThisWeekAchieved: false,
      currentStreak: 0,
      achievedWeeksCount: 0,
    };
  }

  const [ty, tm, td] = todayStr.split('-').map(Number);
  const todayUtc = new Date(Date.UTC(ty, tm - 1, td));
  const dayOfWeek = todayUtc.getUTCDay();

  // Find Sunday of this week
  const msPerDay = 24 * 60 * 60 * 1000;
  let thisWeekSessions = 0;
  for (let offset = -dayOfWeek; offset <= 6 - dayOfWeek; offset++) {
    const cur = new Date(todayUtc.getTime() + offset * msPerDay);
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
    const d = String(cur.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    if (historySet.has(dateStr)) {
      thisWeekSessions++;
    }
  }

  const isThisWeekAchieved = thisWeekSessions >= goal.targetDays;

  // Calculate day streak
  let streak = 0;
  let checkDate = new Date(todayUtc);
  const getStr = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dStr = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dStr}`;
  };

  if (historySet.has(todayStr)) {
    streak++;
    checkDate = new Date(todayUtc.getTime() - msPerDay);
  } else {
    const yesterday = new Date(todayUtc.getTime() - msPerDay);
    if (!historySet.has(getStr(yesterday))) {
      streak = 0;
    } else {
      checkDate = yesterday;
    }
  }

  if (streak > 0 || historySet.has(getStr(new Date(todayUtc.getTime() - msPerDay)))) {
    while (true) {
      const dateStr = getStr(checkDate);
      if (historySet.has(dateStr)) {
        if (dateStr !== todayStr) streak++;
        checkDate = new Date(checkDate.getTime() - msPerDay);
      } else {
        break;
      }
    }
  }

  // Count achieved weeks across history
  const weeks = generateTaskCalendarWeeks(todayStr, 24, history, goal);
  const achievedWeeksCount = weeks.filter((w) => w.isGoalAchieved).length;

  return {
    totalSessions,
    thisWeekSessions,
    isThisWeekAchieved,
    currentStreak: streak,
    achievedWeeksCount,
  };
}
