import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, getBucket } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import {
  isValidObjectId,
  validateTitle,
  validateStudiedOn,
  validateNotes,
  sanitizeLinks,
  sanitizeFiles,
} from '@/lib/validate';
import { addDaysToDate } from '@/lib/logic';
import { INTERVAL_DAYS, RingColor, RingFrequency, TopicDoc, serializeTopic } from '@/lib/types';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid topic ID' }, { status: 400 });
    }

    const db = await getDb();
    const doc = await db.collection<TopicDoc>('topics').findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    return NextResponse.json(serializeTopic(doc));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireOwner(request);
  if (authError) return authError;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid topic ID' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const db = await getDb();
  const topicsCollection = db.collection<TopicDoc>('topics');
  const existing = await topicsCollection.findOne({ _id: new ObjectId(id) });
  if (!existing) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  const updates: Partial<TopicDoc> = {
    updatedAt: new Date(),
  };

  if (body.title !== undefined) {
    const titleVal = validateTitle(body.title);
    if (!titleVal.valid) {
      return NextResponse.json({ error: titleVal.error }, { status: 400 });
    }
    updates.title = titleVal.value!;
  }

  if (body.studiedOn !== undefined) {
    const dateVal = validateStudiedOn(body.studiedOn);
    if (!dateVal.valid) {
      return NextResponse.json({ error: dateVal.error }, { status: 400 });
    }
    updates.studiedOn = dateVal.value!;

    // Recalculate nextDueAt only if stage === 0
    if (existing.revision.stage === 0) {
      updates.revision = {
        stage: 0,
        nextDueAt: addDaysToDate(dateVal.value!, INTERVAL_DAYS[0]),
      };
    }
  }

  if (body.notes !== undefined) {
    const notesVal = validateNotes(body.notes);
    if (!notesVal.valid) {
      return NextResponse.json({ error: notesVal.error }, { status: 400 });
    }
    updates.notes = notesVal.value;
  }

  if (body.links !== undefined) {
    const linksVal = sanitizeLinks(body.links);
    if (!linksVal.valid) {
      return NextResponse.json({ error: linksVal.error }, { status: 400 });
    }
    updates.links = linksVal.value;
  }

  if (body.files !== undefined) {
    const filesVal = sanitizeFiles(body.files);
    if (!filesVal.valid) {
      return NextResponse.json({ error: filesVal.error }, { status: 400 });
    }
    updates.files = filesVal.value;

    // Check for removed files and delete them from GridFS (5.8)
    const newFileIds = new Set(filesVal.value!.map((f) => f.fileId.toString()));
    const removedFiles = (existing.files || []).filter(
      (f) => !newFileIds.has(f.fileId.toString())
    );

    if (removedFiles.length > 0) {
      const bucket = await getBucket();
      await Promise.all(
        removedFiles.map((f) => bucket.delete(f.fileId).catch(() => {}))
      );
    }
  }

  if (body.ring !== undefined) {
    if (body.ring === null) {
      updates.ring = undefined;
    } else if (typeof body.ring === 'object') {
      const r = body.ring as Record<string, unknown>;
      const existingHistory = existing.ring?.history || [];
      const newHistory = Array.isArray(r.history) ? (r.history as string[]) : existingHistory;
      updates.ring = {
        active: Boolean(r.active),
        frequency: (r.frequency as RingFrequency) || existing.ring?.frequency || 'daily',
        targetDays: typeof r.targetDays === 'number' ? r.targetDays : existing.ring?.targetDays,
        targetPeriod: (r.targetPeriod as 'week' | 'month') || existing.ring?.targetPeriod || 'week',
        color: (r.color as RingColor) || existing.ring?.color || 'amber',
        lastStudiedAt: typeof r.lastStudiedAt === 'string' ? r.lastStudiedAt : existing.ring?.lastStudiedAt,
        sessionsCount: typeof r.sessionsCount === 'number' ? r.sessionsCount : existing.ring?.sessionsCount || 0,
        history: newHistory,
      };
    }
  }

  await topicsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updates }
  );

  const updated = await topicsCollection.findOne({ _id: new ObjectId(id) });
  return NextResponse.json(serializeTopic(updated!));
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireOwner(request);
  if (authError) return authError;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid topic ID' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const topicsCollection = db.collection<TopicDoc>('topics');
    const existing = await topicsCollection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    // Delete all attached GridFS files (5.8)
    if (existing.files && existing.files.length > 0) {
      const bucket = await getBucket();
      await Promise.all(
        existing.files.map((f) => bucket.delete(f.fileId).catch(() => {}))
      );
    }

    await topicsCollection.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
