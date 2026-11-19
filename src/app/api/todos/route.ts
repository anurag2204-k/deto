import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import {
  TodoFolderDoc,
  TodoItemDoc,
  serializeTodoFolder,
  serializeTodoItem,
} from '@/lib/types';

export async function GET() {
  try {
    const db = await getDb();
    const foldersCollection = db.collection<TodoFolderDoc>('todo_folders');
    const itemsCollection = db.collection<TodoItemDoc>('todo_items');

    const [folderDocs, itemDocs] = await Promise.all([
      foldersCollection.find({}).sort({ order: 1, createdAt: 1 }).toArray(),
      itemsCollection.find({}).sort({ order: 1, createdAt: -1 }).toArray(),
    ]);

    return NextResponse.json({
      folders: folderDocs.map(serializeTodoFolder),
      items: itemDocs.map(serializeTodoItem),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
