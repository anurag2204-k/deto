import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { isValidObjectId } from '@/lib/validate';
import { TodoItemDoc, TodoSubtask, serializeTodoItem } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireOwner(request);
  if (authError) return authError;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid to-do ID' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updateFields: Partial<TodoItemDoc> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (typeof body.text === 'string' && body.text.trim()) {
    updateFields.text = body.text.trim();
  }

  if (typeof body.done === 'boolean') {
    updateFields.done = body.done;
  }

  if (body.notes !== undefined) {
    updateFields.notes = typeof body.notes === 'string' ? body.notes.trim() : undefined;
  }

  if (body.folderId !== undefined) {
    if (body.folderId === null) {
      updateFields.folderId = null;
    } else if (typeof body.folderId === 'string' && isValidObjectId(body.folderId)) {
      updateFields.folderId = new ObjectId(body.folderId);
    }
  }

  if (typeof body.order === 'number') {
    updateFields.order = body.order;
  }

  if (Array.isArray(body.subtasks)) {
    updateFields.subtasks = (body.subtasks as Array<{ id?: string; text?: string; done?: boolean }>).map(
      (s, idx) => ({
        id: s.id || `sub-${Date.now()}-${idx}`,
        text: String(s.text || '').trim(),
        done: Boolean(s.done),
      })
    );
  }

  try {
    const db = await getDb();
    const collection = db.collection<TodoItemDoc>('todo_items');
    const itemId = new ObjectId(id);

    const res = await collection.findOneAndUpdate(
      { _id: itemId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!res) {
      return NextResponse.json({ error: 'To-do item not found' }, { status: 404 });
    }

    return NextResponse.json(serializeTodoItem(res));
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
    return NextResponse.json({ error: 'Invalid to-do ID' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const collection = db.collection<TodoItemDoc>('todo_items');

    const res = await collection.deleteOne({ _id: new ObjectId(id) });
    if (res.deletedCount === 0) {
      return NextResponse.json({ error: 'To-do item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
