import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { isValidObjectId } from '@/lib/validate';
import { TodoItemDoc, TodoSubtask, serializeTodoItem } from '@/lib/types';

export async function POST(request: NextRequest) {
  const authError = requireOwner(request);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'To-do text is required' }, { status: 400 });
  }

  let folderId: ObjectId | null = null;
  if (body.folderId && typeof body.folderId === 'string' && isValidObjectId(body.folderId)) {
    folderId = new ObjectId(body.folderId);
  }

  const notes = typeof body.notes === 'string' ? body.notes.trim() : undefined;
  const subtasks: TodoSubtask[] = Array.isArray(body.subtasks)
    ? (body.subtasks as Array<{ id?: string; text?: string; done?: boolean }>).map((s, idx) => ({
        id: s.id || `sub-${Date.now()}-${idx}`,
        text: String(s.text || '').trim(),
        done: Boolean(s.done),
      }))
    : [];

  try {
    const db = await getDb();
    const collection = db.collection<TodoItemDoc>('todo_items');

    const count = await collection.countDocuments({ folderId });
    const now = new Date();

    const newItem: TodoItemDoc = {
      _id: new ObjectId(),
      folderId,
      text,
      done: false,
      notes,
      order: count,
      subtasks,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(newItem);
    return NextResponse.json(serializeTodoItem(newItem), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
