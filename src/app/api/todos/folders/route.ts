import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { TodoFolderDoc, serializeTodoFolder } from '@/lib/types';

export async function POST(request: NextRequest) {
  const authError = requireOwner(request);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
  }

  let parentId: ObjectId | null = null;
  if (body.parentId && typeof body.parentId === 'string' && ObjectId.isValid(body.parentId)) {
    parentId = new ObjectId(body.parentId);
  }

  const color = typeof body.color === 'string' ? body.color : 'indigo';

  try {
    const db = await getDb();
    const collection = db.collection<TodoFolderDoc>('todo_folders');

    const count = await collection.countDocuments({ parentId });
    const now = new Date();

    const newFolder: TodoFolderDoc = {
      _id: new ObjectId(),
      name,
      parentId,
      color,
      order: count,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(newFolder);
    return NextResponse.json(serializeTodoFolder(newFolder), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
