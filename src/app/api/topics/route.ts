import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import {
  validateTitle,
  validateStudiedOn,
  validateNotes,
  sanitizeLinks,
  sanitizeFiles,
  isValidDateString,
} from '@/lib/validate';
import { computeInitialQueuePos, computeInitialRevision } from '@/lib/logic';
import { RingColor, RingFrequency, TopicDoc, serializeLightweightTopic, serializeTopic } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');
    const db = await getDb();
    const topicsCollection = db.collection<TopicDoc>('topics');

    const projection = {
      _id: 1,
      title: 1,
      studiedOn: 1,
      queuePos: 1,
      revision: 1,
      ring: 1,
    };

    if (view === 'queue') {
      const docs = await topicsCollection
        .find({}, { projection })
        .sort({ queuePos: 1 })
        .toArray();

      return NextResponse.json(docs.map(serializeLightweightTopic));
    }

    if (view === 'due') {
      const today = searchParams.get('today');
      if (!today || !isValidDateString(today)) {
        return NextResponse.json(
          { error: 'Query parameter "today" is required in YYYY-MM-DD format' },
          { status: 400 }
        );
      }

      const docs = await topicsCollection
        .find({ 'revision.nextDueAt': { $lte: today } }, { projection })
        .sort({ 'revision.nextDueAt': 1 })
        .toArray();

      return NextResponse.json(docs.map(serializeLightweightTopic));
    }

    if (view === 'ring') {
      const docs = await topicsCollection
        .find({ 'ring.active': true }, { projection })
        .sort({ updatedAt: -1 })
        .toArray();

      return NextResponse.json(docs.map(serializeLightweightTopic));
    }

    return NextResponse.json(
      { error: 'Invalid or missing "view" query parameter. Must be "queue", "due", or "ring"' },
      { status: 400 }
    );
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
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const titleValidation = validateTitle(body.title);
  if (!titleValidation.valid) {
    return NextResponse.json({ error: titleValidation.error }, { status: 400 });
  }

  const studiedOnValidation = validateStudiedOn(body.studiedOn);
  if (!studiedOnValidation.valid) {
    return NextResponse.json({ error: studiedOnValidation.error }, { status: 400 });
  }

  const notesValidation = validateNotes(body.notes);
  if (!notesValidation.valid) {
    return NextResponse.json({ error: notesValidation.error }, { status: 400 });
  }

  const linksValidation = sanitizeLinks(body.links);
  if (!linksValidation.valid) {
    return NextResponse.json({ error: linksValidation.error }, { status: 400 });
  }

  const filesValidation = sanitizeFiles(body.files);
  if (!filesValidation.valid) {
    return NextResponse.json({ error: filesValidation.error }, { status: 400 });
  }

  try {
    const db = await getDb();
    const topicsCollection = db.collection<TopicDoc>('topics');

    // Find current max queuePos
    const lastTopic = await topicsCollection
      .find({}, { projection: { queuePos: 1 } })
      .sort({ queuePos: -1 })
      .limit(1)
      .toArray();

    const currentMaxQueuePos = lastTopic.length > 0 ? lastTopic[0].queuePos : null;
    const queuePos = computeInitialQueuePos(currentMaxQueuePos);
    const revision = computeInitialRevision(studiedOnValidation.value!);

    const now = new Date();
    let ringData = undefined;
    if (body.ring && typeof body.ring === 'object') {
      const r = body.ring as Record<string, unknown>;
      const historyList = Array.isArray(r.history)
        ? (r.history as string[])
        : r.lastStudiedAt
        ? [String(r.lastStudiedAt)]
        : [];
      ringData = {
        active: Boolean(r.active),
        frequency: (r.frequency as RingFrequency) || 'daily',
        targetDays: typeof r.targetDays === 'number' ? r.targetDays : undefined,
        targetPeriod: (r.targetPeriod as 'week' | 'month') || 'week',
        color: (r.color as RingColor) || 'amber',
        lastStudiedAt: typeof r.lastStudiedAt === 'string' ? r.lastStudiedAt : undefined,
        sessionsCount: typeof r.sessionsCount === 'number' ? r.sessionsCount : 0,
        history: historyList,
      };
    }

    const docToInsert: Omit<TopicDoc, '_id'> = {
      title: titleValidation.value!,
      studiedOn: studiedOnValidation.value!,
      notes: notesValidation.value,
      links: linksValidation.value,
      files: filesValidation.value,
      queuePos,
      revision,
      ring: ringData,
      createdAt: now,
      updatedAt: now,
    };

    const result = await topicsCollection.insertOne(docToInsert as TopicDoc);
    const insertedDoc: TopicDoc = {
      _id: result.insertedId,
      ...docToInsert,
    };

    // Record activity for studiedOn
    const activityUpdate: Record<string, unknown> = {
      queue: true,
      updatedAt: now,
    };
    if (ringData?.active) {
      activityUpdate.ring = true;
    }
    await db.collection('activity').updateOne(
      { date: studiedOnValidation.value! },
      { $set: activityUpdate, $inc: { count: 1 } },
      { upsert: true }
    );

    return NextResponse.json(serializeTopic(insertedDoc), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
