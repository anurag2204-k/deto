import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { isValidObjectId, isValidDateString } from '@/lib/validate';
import { computeNextRevision } from '@/lib/logic';
import { TopicDoc, serializeLightweightTopic } from '@/lib/types';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireOwner(request);
  if (authError) return authError;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid topic ID' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const today = searchParams.get('today');
  if (!today || !isValidDateString(today)) {
    return NextResponse.json(
      { error: 'Query parameter "today" is required in YYYY-MM-DD format' },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const topicsCollection = db.collection<TopicDoc>('topics');

    const topic = await topicsCollection.findOne({ _id: new ObjectId(id) });
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const nextRevision = computeNextRevision(topic.revision.stage, today);

    await topicsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { revision: nextRevision, updatedAt: new Date() } }
    );

    // Record activity for today (Revision = Blue)
    await db.collection('activity').updateOne(
      { date: today },
      { $set: { queue: true, updatedAt: new Date() }, $inc: { count: 1 } },
      { upsert: true }
    );

    const updated = await topicsCollection.findOne({ _id: new ObjectId(id) });
    return NextResponse.json(serializeLightweightTopic(updated!));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
