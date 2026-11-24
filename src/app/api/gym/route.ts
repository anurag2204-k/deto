import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { GymLogDoc, GymSet, serializeGymLog } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('exerciseId');
    const dayKey = searchParams.get('dayKey');
    const date = searchParams.get('date');

    const db = await getDb();
    const collection = db.collection<GymLogDoc>('gym_logs');

    const query: Record<string, unknown> = {};
    if (exerciseId) query.exerciseId = exerciseId;
    if (dayKey) query.dayKey = dayKey;
    if (date) query.date = date;

    const docs = await collection
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json(docs.map(serializeGymLog));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = requireOwner(request);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const exerciseId = typeof body.exerciseId === 'string' ? body.exerciseId.trim() : '';
  const exerciseName = typeof body.exerciseName === 'string' ? body.exerciseName.trim() : '';
  const dayKey = typeof body.dayKey === 'string' ? body.dayKey.trim() : '';
  const date = typeof body.date === 'string' && body.date.trim() ? body.date.trim() : new Date().toISOString().slice(0, 10);

  if (!exerciseId || !exerciseName) {
    return NextResponse.json({ error: 'exerciseId and exerciseName are required' }, { status: 400 });
  }

  const rawSlots = Array.isArray(body.slots) ? body.slots : [];
  const slots: GymSet[] = rawSlots.map((s, idx) => ({
    setNumber: typeof s.setNumber === 'number' ? s.setNumber : idx + 1,
    weight: typeof s.weight === 'number' ? Math.max(0, s.weight) : Number(s.weight) || 0,
    reps: typeof s.reps === 'number' ? Math.max(0, s.reps) : Number(s.reps) || 0,
    rpe: typeof s.rpe === 'number' ? s.rpe : undefined,
    completed: typeof s.completed === 'boolean' ? s.completed : true,
  }));

  const notes = typeof body.notes === 'string' ? body.notes.trim() : undefined;
  const now = new Date();

  try {
    const db = await getDb();
    const collection = db.collection<GymLogDoc>('gym_logs');

    // Check if an entry for this exercise and date already exists
    const existing = await collection.findOne({ exerciseId, date });

    if (existing) {
      await collection.updateOne(
        { _id: existing._id },
        {
          $set: {
            slots,
            notes,
            dayKey: dayKey || existing.dayKey,
            updatedAt: now,
          },
        }
      );

      const updated = await collection.findOne({ _id: existing._id });
      if (!updated) {
        return NextResponse.json({ error: 'Failed to retrieve updated gym log' }, { status: 500 });
      }
      return NextResponse.json(serializeGymLog(updated));
    }

    const newDoc: GymLogDoc = {
      _id: new ObjectId(),
      exerciseId,
      exerciseName,
      dayKey,
      date,
      slots,
      notes,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(newDoc);
    return NextResponse.json(serializeGymLog(newDoc), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
