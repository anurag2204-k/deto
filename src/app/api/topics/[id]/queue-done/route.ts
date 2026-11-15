import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { isValidObjectId } from '@/lib/validate';
import { computeQueueDonePos } from '@/lib/logic';
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

  try {
    const db = await getDb();
    const topicsCollection = db.collection<TopicDoc>('topics');

    const topic = await topicsCollection.findOne({ _id: new ObjectId(id) });
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    // Find current max queuePos
    const lastTopic = await topicsCollection
      .find({}, { projection: { queuePos: 1 } })
      .sort({ queuePos: -1 })
      .limit(1)
      .toArray();

    const currentMax = lastTopic.length > 0 ? lastTopic[0].queuePos : topic.queuePos;
    const newQueuePos = computeQueueDonePos(currentMax);

    await topicsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { queuePos: newQueuePos, updatedAt: new Date() } }
    );

    // Record activity for today (Queue = Blue)
    const today = new Date().toISOString().split('T')[0];
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
