import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { isValidObjectId } from '@/lib/validate';
import { TodoFolderDoc, TodoItemDoc, serializeTodoFolder } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireOwner(request);
  if (authError) return authError;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updateFields: Partial<TodoFolderDoc> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (typeof body.name === 'string' && body.name.trim()) {
    updateFields.name = body.name.trim();
  }
  if (typeof body.color === 'string') {
    updateFields.color = body.color;
  }
  if (typeof body.order === 'number') {
    updateFields.order = body.order;
  }
  if (body.parentId !== undefined) {
    if (body.parentId === null) {
      updateFields.parentId = null;
    } else if (typeof body.parentId === 'string' && isValidObjectId(body.parentId)) {
      updateFields.parentId = new ObjectId(body.parentId);
    }
  }

  try {
    const db = await getDb();
    const collection = db.collection<TodoFolderDoc>('todo_folders');
    const folderId = new ObjectId(id);

    const res = await collection.findOneAndUpdate(
      { _id: folderId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!res) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json(serializeTodoFolder(res));
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
    return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const foldersCollection = db.collection<TodoFolderDoc>('todo_folders');
    const itemsCollection = db.collection<TodoItemDoc>('todo_items');

    const folderId = new ObjectId(id);

    // Recursively find all child folder IDs
    const allFolderIdsToDelete: ObjectId[] = [folderId];
    const findChildren = async (pId: ObjectId) => {
      const children = await foldersCollection.find({ parentId: pId }).toArray();
      for (const child of children) {
        allFolderIdsToDelete.push(child._id);
        await findChildren(child._id);
      }
    };
    await findChildren(folderId);

    // Delete all child folders and to-do items inside them
    await Promise.all([
      foldersCollection.deleteMany({ _id: { $in: allFolderIdsToDelete } }),
      itemsCollection.deleteMany({ folderId: { $in: allFolderIdsToDelete } }),
    ]);

    return NextResponse.json({
      success: true,
      deletedFolderIds: allFolderIdsToDelete.map(String),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
