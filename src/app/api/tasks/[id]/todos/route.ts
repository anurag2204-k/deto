import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { isValidObjectId } from '@/lib/validate';
import { TaskDoc, TaskTodoItem, serializeTask } from '@/lib/types';

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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const tasksCollection = db.collection<TaskDoc>('tasks');

    const task = await tasksCollection.findOne({ _id: new ObjectId(id) });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    let updatedTodos: TaskTodoItem[] = task.todos || [];

    // Case 1: replace entire todos array
    if (Array.isArray(body.todos)) {
      updatedTodos = (body.todos as Array<{ id?: string; text?: string; done?: boolean }>).map(
        (t, idx) => ({
          id: t.id || `todo-${Date.now()}-${idx}`,
          text: String(t.text || '').trim(),
          done: Boolean(t.done),
        })
      );
    }
    // Case 2: toggle single todo item by todoId
    else if (typeof body.todoId === 'string') {
      const todoId = body.todoId;
      const doneState = typeof body.done === 'boolean' ? body.done : undefined;

      updatedTodos = updatedTodos.map((item) => {
        if (item.id === todoId) {
          return {
            ...item,
            done: doneState !== undefined ? doneState : !item.done,
          };
        }
        return item;
      });

      // Put undone items first, and completed items down at the bottom
      const undone = updatedTodos.filter((item) => !item.done);
      const completed = updatedTodos.filter((item) => item.done);
      updatedTodos = [...undone, ...completed];
    }
    // Case 3: add new todo
    else if (typeof body.addText === 'string' && body.addText.trim()) {
      const newTodo: TaskTodoItem = {
        id: `todo-${Date.now()}`,
        text: body.addText.trim(),
        done: false,
      };
      // Add new undone item to the end of undone items (before completed items)
      const undone = updatedTodos.filter((item) => !item.done);
      const completed = updatedTodos.filter((item) => item.done);
      updatedTodos = [...undone, newTodo, ...completed];
    }

    await tasksCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { todos: updatedTodos, updatedAt: new Date() } }
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
