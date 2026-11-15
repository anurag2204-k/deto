import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { TaskDoc, TaskSchedule, TaskTodoItem, RingColor, RingFrequency, serializeTask } from '@/lib/types';
import { getRingGoal } from '@/lib/logic';

export async function GET() {
  try {
    const db = await getDb();
    const tasksCollection = db.collection<TaskDoc>('tasks');
    const docs = await tasksCollection.find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();
    return NextResponse.json(docs.map(serializeTask));
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

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
  }

  const description = typeof body.description === 'string' ? body.description.trim() : undefined;
  const color = (body.color as RingColor) || 'emerald';

  const freq = (body.frequency as RingFrequency) || '4x-week';
  const goal = getRingGoal({ active: true, frequency: freq });
  const schedule: TaskSchedule = {
    frequency: freq,
    targetDays: typeof body.targetDays === 'number' ? body.targetDays : goal.targetDays,
    targetPeriod: (body.targetPeriod as 'week' | 'month') || goal.period,
    daysOfWeek: Array.isArray(body.daysOfWeek) ? (body.daysOfWeek as number[]) : undefined,
  };

  const todos: TaskTodoItem[] = Array.isArray(body.todos)
    ? (body.todos as Array<{ id?: string; text?: string; done?: boolean }>).map((item, idx) => ({
        id: item.id || `todo-${Date.now()}-${idx}`,
        text: String(item.text || '').trim(),
        done: Boolean(item.done),
      }))
    : [];

  const linkedTopicIds: string[] = Array.isArray(body.linkedTopicIds)
    ? (body.linkedTopicIds as string[]).map(String)
    : [];

  const now = new Date();
  const docToInsert: Omit<TaskDoc, '_id'> = {
    title,
    description,
    color,
    schedule,
    todos,
    linkedTopicIds,
    history: [],
    sessionsCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const db = await getDb();
    const tasksCollection = db.collection<TaskDoc>('tasks');
    const result = await tasksCollection.insertOne(docToInsert as TaskDoc);

    const inserted: TaskDoc = {
      _id: result.insertedId,
      ...docToInsert,
    };

    return NextResponse.json(serializeTask(inserted), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
