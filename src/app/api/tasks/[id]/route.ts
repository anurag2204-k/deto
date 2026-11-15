import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { isValidObjectId } from '@/lib/validate';
import { TaskDoc, TaskSchedule, RingColor, RingFrequency, serializeTask } from '@/lib/types';
import { getRingGoal } from '@/lib/logic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const tasksCollection = db.collection<TaskDoc>('tasks');
    const doc = await tasksCollection.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json(serializeTask(doc));
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
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const tasksCollection = db.collection<TaskDoc>('tasks');
    const existing = await tasksCollection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const updates: Partial<TaskDoc> = {
      updatedAt: new Date(),
    };

    if (typeof body.title === 'string' && body.title.trim()) {
      updates.title = body.title.trim();
    }
    if (body.description !== undefined) {
      updates.description = typeof body.description === 'string' ? body.description.trim() : undefined;
    }
    if (body.color !== undefined) {
      updates.color = (body.color as RingColor) || existing.color;
    }

    if (body.schedule !== undefined || body.frequency !== undefined) {
      const s = (body.schedule as Record<string, unknown>) || {};
      const freq = (s.frequency || body.frequency || existing.schedule.frequency) as RingFrequency;
      const goal = getRingGoal({ active: true, frequency: freq });
      const sched: TaskSchedule = {
        frequency: freq,
        targetDays:
          typeof s.targetDays === 'number'
            ? s.targetDays
            : typeof body.targetDays === 'number'
            ? body.targetDays
            : goal.targetDays,
        targetPeriod: (s.targetPeriod || body.targetPeriod || goal.period) as 'week' | 'month',
        daysOfWeek: Array.isArray(s.daysOfWeek) ? (s.daysOfWeek as number[]) : existing.schedule.daysOfWeek,
      };
      updates.schedule = sched;
    }

    if (Array.isArray(body.todos)) {
      updates.todos = (body.todos as Array<{ id?: string; text?: string; done?: boolean }>).map(
        (item, idx) => ({
          id: item.id || `todo-${Date.now()}-${idx}`,
          text: String(item.text || '').trim(),
          done: Boolean(item.done),
        })
      );
    }

    if (Array.isArray(body.linkedTopicIds)) {
      updates.linkedTopicIds = (body.linkedTopicIds as string[]).map(String);
    }

    await tasksCollection.updateOne({ _id: new ObjectId(id) }, { $set: updates });
    const updated = await tasksCollection.findOne({ _id: new ObjectId(id) });
    return NextResponse.json(serializeTask(updated!));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireOwner(request);
  if (authError) return authError;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const tasksCollection = db.collection<TaskDoc>('tasks');
    await tasksCollection.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
