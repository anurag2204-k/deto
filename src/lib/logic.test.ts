import { describe, it, expect } from 'vitest';
import {
  addDaysToDate,
  computeInitialRevision,
  computeNextRevision,
  computeInitialQueuePos,
  computeQueueDonePos,
  calculateNewQueuePos,
  calculateOverdueDays,
  formatOverdueLabel,
  getFrequencyDays,
  formatRingCadence,
  computeRingStatus,
  generateCalendarWeeks,
  calculateStudyStreak,
  getRingGoal,
  generateTaskCalendarWeeks,
  calculateTaskStreak,
} from './logic';

describe('Logic unit tests', () => {
  describe('addDaysToDate', () => {
    it('adds days correctly across months and leap years', () => {
      expect(addDaysToDate('2026-01-01', 1)).toBe('2026-01-02');
      expect(addDaysToDate('2026-01-31', 1)).toBe('2026-02-01');
      expect(addDaysToDate('2026-02-28', 1)).toBe('2026-03-01');
      expect(addDaysToDate('2026-12-31', 1)).toBe('2027-01-01');
      expect(addDaysToDate('2024-02-28', 1)).toBe('2024-02-29'); // Leap year
      expect(addDaysToDate('2026-01-01', 30)).toBe('2026-01-31');
    });
  });

  describe('Queue Position calculations', () => {
    it('initial queue position is 1000 for empty list or max + 1000', () => {
      expect(computeInitialQueuePos(null)).toBe(1000);
      expect(computeInitialQueuePos(undefined)).toBe(1000);
      expect(computeInitialQueuePos(1000)).toBe(2000);
      expect(computeInitialQueuePos(3500)).toBe(4500);
    });

    it('computeQueueDonePos moves to max + 1000', () => {
      expect(computeQueueDonePos(5000)).toBe(6000);
    });

    it('fractional positioning for moves', () => {
      // Moved to top: prevId null
      const toTop = calculateNewQueuePos(null, 1000);
      expect(toTop.newPos).toBe(0);
      expect(toTop.needsRebalance).toBe(false);

      // Moved to bottom: nextId null
      const toBottom = calculateNewQueuePos(3000, null);
      expect(toBottom.newPos).toBe(4000);
      expect(toBottom.needsRebalance).toBe(false);

      // Between two items: (prev + next) / 2
      const between = calculateNewQueuePos(1000, 2000);
      expect(between.newPos).toBe(1500);
      expect(between.needsRebalance).toBe(false);

      // Single item: both null
      const single = calculateNewQueuePos(null, null);
      expect(single.newPos).toBe(1000);
      expect(single.needsRebalance).toBe(false);

      // Rebalance detected when gap < 1e-6
      const tinyGap = calculateNewQueuePos(1000, 1000 + 1e-7);
      expect(tinyGap.needsRebalance).toBe(true);
    });
  });

  describe('Revision Spaced Repetition Sequence (5.5)', () => {
    it('initial revision is due 1 day after studiedOn with stage 0', () => {
      const rev = computeInitialRevision('2026-03-01');
      expect(rev.stage).toBe(0);
      expect(rev.nextDueAt).toBe('2026-03-02');
    });

    it('follows the sequence: +3 -> +7 -> +14 -> +30 -> +30 forever', () => {
      const today = '2026-03-02';

      // First revision done (stage 0 -> stage 1): +3 days
      const r1 = computeNextRevision(0, today);
      expect(r1.stage).toBe(1);
      expect(r1.nextDueAt).toBe('2026-03-05'); // 2 + 3

      // Second revision done (stage 1 -> stage 2): +7 days
      const r2 = computeNextRevision(1, '2026-03-05');
      expect(r2.stage).toBe(2);
      expect(r2.nextDueAt).toBe('2026-03-12'); // 5 + 7

      // Third revision done (stage 2 -> stage 3): +14 days
      const r3 = computeNextRevision(2, '2026-03-12');
      expect(r3.stage).toBe(3);
      expect(r3.nextDueAt).toBe('2026-03-26'); // 12 + 14

      // Fourth revision done (stage 3 -> stage 4): +30 days
      const r4 = computeNextRevision(3, '2026-03-26');
      expect(r4.stage).toBe(4);
      expect(r4.nextDueAt).toBe('2026-04-25'); // 26 + 30

      // Fifth revision done (stage 4 -> stage 5): +30 days
      const r5 = computeNextRevision(4, '2026-04-25');
      expect(r5.stage).toBe(5);
      expect(r5.nextDueAt).toBe('2026-05-25'); // 25 + 30

      // Indefinitely repeats +30 days
      const r10 = computeNextRevision(10, '2026-10-01');
      expect(r10.stage).toBe(11);
      expect(r10.nextDueAt).toBe('2026-10-31');
    });
  });

  describe('Overdue labels and calculations', () => {
    it('calculates overdue days correctly', () => {
      expect(calculateOverdueDays('2026-03-10', '2026-03-10')).toBe(0);
      expect(calculateOverdueDays('2026-03-09', '2026-03-10')).toBe(1);
      expect(calculateOverdueDays('2026-03-05', '2026-03-10')).toBe(5);
    });

    it('formats overdue labels properly', () => {
      expect(formatOverdueLabel('2026-03-10', '2026-03-10')).toBe('due today');
      expect(formatOverdueLabel('2026-03-09', '2026-03-10')).toBe('1 day overdue');
      expect(formatOverdueLabel('2026-03-06', '2026-03-10')).toBe('4 days overdue');
    });
  });

  describe('Ring Cadence and Status', () => {
    it('returns frequency days correctly', () => {
      expect(getFrequencyDays('daily')).toBe(1);
      expect(getFrequencyDays('every-2-days')).toBe(2);
      expect(getFrequencyDays('4x-week')).toBe(2);
      expect(getFrequencyDays('weekly')).toBe(7);
      expect(formatRingCadence('daily')).toContain('Daily');
      expect(formatRingCadence('4x-week')).toBe('At least 4 days / week');
    });

    it('computes closed today status when studiedOn is today', () => {
      const res = computeRingStatus(
        { active: true, frequency: 'daily', lastStudiedAt: '2026-11-15', sessionsCount: 1 },
        '2026-11-15'
      );
      expect(res.status).toBe('closed-today');
      expect(res.progressPercent).toBe(100);
    });

    it('computes due today status when daily session is due', () => {
      const res = computeRingStatus(
        { active: true, frequency: 'daily', lastStudiedAt: '2026-11-14', sessionsCount: 1 },
        '2026-11-15'
      );
      expect(res.status).toBe('due-today');
    });

    it('computes overdue status with reminder text when session missed', () => {
      const res = computeRingStatus(
        { active: true, frequency: 'daily', lastStudiedAt: '2026-11-12', sessionsCount: 1 },
        '2026-11-15'
      );
      expect(res.status).toBe('overdue');
      expect(res.reminderText).toContain('Not done yet! Overdue by 2 days');
    });
  });

  describe('Activity Calendar & Streaks', () => {
    it('generates correct number of weeks and days', () => {
      const weeks = generateCalendarWeeks('2026-11-15', 10);
      expect(weeks.length).toBe(10);
      weeks.forEach((w) => expect(w.days.length).toBe(7));
    });

    it('calculates streaks correctly for active days', () => {
      const act = {
        '2026-11-13': { queue: true },
        '2026-11-14': { ring: true },
        '2026-11-15': { queue: true, ring: true },
      };
      const res = calculateStudyStreak(act, '2026-11-15');
      expect(res.currentStreak).toBe(3);
      expect(res.totalActiveDays).toBe(3);
    });

    it('handles gap in streaks', () => {
      const act = {
        '2026-11-10': { queue: true },
        '2026-11-15': { ring: true },
      };
      const res = calculateStudyStreak(act, '2026-11-15');
      expect(res.currentStreak).toBe(1);
      expect(res.totalActiveDays).toBe(2);
    });
  });

  describe('Task-Specific Calendar & Weekly Goal Achievement', () => {
    it('correctly parses goal for 4x-week (e.g. gym)', () => {
      const goal = getRingGoal({ active: true, frequency: '4x-week' });
      expect(goal.targetDays).toBe(4);
      expect(goal.period).toBe('week');
      expect(goal.label).toBe('At least 4 days / week');
    });

    it('colors the whole week when weekly target is achieved (4 gym sessions in a week)', () => {
      // 2026-11-15 is Sunday. The week prior ended Sat 2026-11-14 (Sun Nov 8 to Sat Nov 14).
      // Suppose user went to gym on Nov 9 (Mon), Nov 10 (Tue), Nov 12 (Thu), Nov 14 (Sat) -> 4 sessions
      const gymHistory = ['2026-11-09', '2026-11-10', '2026-11-12', '2026-11-14'];
      const goal = { targetDays: 4, period: 'week' as const };
      const weeks = generateTaskCalendarWeeks('2026-11-15', 4, gymHistory, goal);

      // Find the week containing 2026-11-09
      const targetWeek = weeks.find((w) =>
        w.days.some((d) => d?.date === '2026-11-09')
      );
      expect(targetWeek).toBeDefined();
      expect(targetWeek!.completedCount).toBe(4);
      expect(targetWeek!.isGoalAchieved).toBe(true);

      // All days in this week must have weekGoalAchieved = true
      targetWeek!.days.forEach((day) => {
        expect(day!.weekGoalAchieved).toBe(true);
      });

      // Individual session days
      const mon = targetWeek!.days.find((d) => d?.date === '2026-11-09');
      const wed = targetWeek!.days.find((d) => d?.date === '2026-11-11'); // rest day
      expect(mon!.hasSession).toBe(true);
      expect(wed!.hasSession).toBe(false);
      expect(wed!.weekGoalAchieved).toBe(true); // whole week is colored!
    });

    it('does NOT mark week achieved if target was not met', () => {
      // Only 2 gym sessions (target is 4)
      const gymHistory = ['2026-11-09', '2026-11-10'];
      const goal = { targetDays: 4, period: 'week' as const };
      const weeks = generateTaskCalendarWeeks('2026-11-15', 4, gymHistory, goal);

      const targetWeek = weeks.find((w) =>
        w.days.some((d) => d?.date === '2026-11-09')
      );
      expect(targetWeek).toBeDefined();
      expect(targetWeek!.completedCount).toBe(2);
      expect(targetWeek!.isGoalAchieved).toBe(false);
      targetWeek!.days.forEach((day) => {
        expect(day!.weekGoalAchieved).toBe(false);
      });
    });

    it('handles monthly targets (e.g. 15 days in a month)', () => {
      const dates: string[] = [];
      for (let day = 1; day <= 15; day++) {
        dates.push(`2026-11-${String(day).padStart(2, '0')}`);
      }
      const goal = { targetDays: 15, period: 'month' as const };
      const weeks = generateTaskCalendarWeeks('2026-11-15', 4, dates, goal);

      // November has 15 completed days, so all November weeks are achieved
      const novWeek = weeks.find((w) => w.monthString === '2026-11');
      expect(novWeek).toBeDefined();
      expect(novWeek!.isGoalAchieved).toBe(true);
    });

    it('calculates task-specific streak stats', () => {
      const history = ['2026-11-13', '2026-11-14', '2026-11-15'];
      const stats = calculateTaskStreak(history, '2026-11-15', { targetDays: 4, period: 'week' });
      expect(stats.totalSessions).toBe(3);
      expect(stats.currentStreak).toBe(3);
    });
  });
});
