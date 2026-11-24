import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { isValidObjectId } from '@/lib/validate';
import { GymLogDoc, GymSet, serializeGymLog } from '@/lib/types';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireOwner(request);
  if (authError) return authError;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid gym log ID' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const collection = db.collection<GymLogDoc>('gym_logs');
    const res = await collection.deleteOne({ _id: new ObjectId(id) });

    if (res.deletedCount === 0) {
      return NextResponse.json({ error: 'Gym log not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireOwner(request);
  if (authError) return authError;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid gym log ID' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawSlots = Array.isArray(body.slots) ? body.slots : [];
  const slots: GymSet[] = rawSlots.map((s, idx) => ({
    setNumber: typeof s.setNumber === 'number' ? s.setNumber : idx + 1,
    weight: typeof s.weight === 'number' ? Math.max(0, s.weight) : Number(s.weight) || 0,
    reps: typeof s.reps === 'number' ? Math.max(0, s.reps) : Number(s.reps) || 0,
    rpe: typeof s.rpe === 'number' ? s.rpe : undefined,
    completed: typeof s.completed === 'boolean' ? s.completed : true,
  }));

  const updateData: Partial<GymLogDoc> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (Array.isArray(body.slots)) {
    updateData.slots = slots;
  }
  if (body.notes !== undefined) {
    updateData.notes = typeof body.notes === 'string' ? body.notes.trim() : undefined;
  }
  if (typeof body.date === 'string' && body.date.trim()) {
    updateData.date = body.date.trim();
  }

  try {
    const db = await getDb();
    const collection = db.collection<GymLogDoc>('gym_logs');
    const res = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!res) {
      return NextResponse.json({ error: 'Gym log not found' }, { status: 404 });
    }

    return NextResponse.json(serializeGymLog(res));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
