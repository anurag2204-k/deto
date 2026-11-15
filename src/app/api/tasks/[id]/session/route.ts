import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { isValidObjectId, isValidDateString } from '@/lib/validate';
import { TaskDoc, serializeTask } from '@/lib/types';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireOwner(request);
  if (authError) return authError;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
  }

  let body: { date?: string } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const todayStr =
    body.date && isValidDateString(body.date)
      ? body.date
      : new Date().toISOString().split('T')[0];

  try {
    const db = await getDb();
    const tasksCollection = db.collection<TaskDoc>('tasks');

    const task = await tasksCollection.findOne({ _id: new ObjectId(id) });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const currentHistory = Array.isArray(task.history) ? task.history : [];
    const isAlreadyLogged = currentHistory.includes(todayStr);
    const updatedHistory = isAlreadyLogged ? currentHistory : [...currentHistory, todayStr];
    const newSessionsCount = (task.sessionsCount || 0) + (isAlreadyLogged ? 0 : 1);

    await tasksCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          history: updatedHistory,
          sessionsCount: newSessionsCount,
          lastCompletedAt: todayStr,
          updatedAt: new Date(),
        },
      }
    );

    // Record in global activity heatmap (Ring/Habit = true)
    await db.collection('activity').updateOne(
      { date: todayStr },
      { $set: { ring: true, updatedAt: new Date() }, $inc: { count: 1 } },
      { upsert: true }
    );

    const updated = await tasksCollection.findOne({ _id: new ObjectId(id) });
    return NextResponse.json(serializeTask(updated!));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
