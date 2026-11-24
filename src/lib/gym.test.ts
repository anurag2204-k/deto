import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  GYM_SCHEDULE,
  getAllGymExercises,
  findGymExercise,
  getTodayDayKey,
} from './gymData';
import { serializeGymLog, GymLogDoc } from './types';

describe('Gym PPL Data & Logic', () => {
  it('should contain all 7 days of the week', () => {
    expect(GYM_SCHEDULE).toHaveLength(7);
    const dayIds = GYM_SCHEDULE.map((d) => d.id);
    expect(dayIds).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]);
  });

  it('should have all 38 exercises mapped with cues and targets', () => {
    const exercises = getAllGymExercises();
    expect(exercises.length).toBe(38);

    for (const ex of exercises) {
      expect(ex.id).toBeTruthy();
      expect(ex.name).toBeTruthy();
      expect(ex.target).toBeTruthy();
      expect(ex.setsReps).toBeTruthy();
      expect(ex.executionCue).toBeTruthy();
      expect(ex.restTime).toBeTruthy();
      expect(ex.imageUrl).toBeTruthy();
      expect(ex.defaultSets).toBeGreaterThan(0);
    }
  });

  it('should find specific exercise by id', () => {
    const bench = findGymExercise('barbell-bench-press');
    expect(bench).toBeDefined();
    expect(bench?.name).toBe('Barbell Bench Press');
    expect(bench?.target).toContain('Mid-Chest');

    const squat = findGymExercise('barbell-back-squat');
    expect(squat).toBeDefined();
    expect(squat?.target).toContain('Quads');
  });

  it('should return a valid day key for today', () => {
    const todayKey = getTodayDayKey();
    const validKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    expect(validKeys).toContain(todayKey);
  });

  it('should serialize GymLogDoc correctly', () => {
    const fakeId = new ObjectId();
    const now = new Date('2026-11-24T12:00:00Z');
    const doc: GymLogDoc = {
      _id: fakeId,
      exerciseId: 'barbell-bench-press',
      exerciseName: 'Barbell Bench Press',
      dayKey: 'monday',
      date: '2026-11-24',
      slots: [
        { setNumber: 1, weight: 80, reps: 8, completed: true },
        { setNumber: 2, weight: 80, reps: 7, completed: true },
      ],
      notes: 'Clean reps',
      createdAt: now,
      updatedAt: now,
    };

    const serialized = serializeGymLog(doc);
    expect(serialized._id).toBe(fakeId.toString());
    expect(serialized.exerciseId).toBe('barbell-bench-press');
    expect(serialized.slots).toHaveLength(2);
    expect(serialized.slots[0].weight).toBe(80);
    expect(serialized.createdAt).toBe(now.toISOString());
  });
});
