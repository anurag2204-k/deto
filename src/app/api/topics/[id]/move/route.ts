import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { isValidObjectId } from '@/lib/validate';
import { calculateNewQueuePos } from '@/lib/logic';
import { TopicDoc } from '@/lib/types';

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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { prevId, nextId } = body;
  if (prevId !== null && (typeof prevId !== 'string' || !isValidObjectId(prevId))) {
    return NextResponse.json({ error: 'Invalid prevId' }, { status: 400 });
  }
  if (nextId !== null && (typeof nextId !== 'string' || !isValidObjectId(nextId))) {
    return NextResponse.json({ error: 'Invalid nextId' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const topicsCollection = db.collection<TopicDoc>('topics');

    const targetTopic = await topicsCollection.findOne({ _id: new ObjectId(id) });
    if (!targetTopic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    let prevDoc = prevId
      ? await topicsCollection.findOne({ _id: new ObjectId(prevId) })
      : null;
    let nextDoc = nextId
      ? await topicsCollection.findOne({ _id: new ObjectId(nextId) })
      : null;

    let prevPos = prevDoc ? prevDoc.queuePos : null;
    let nextPos = nextDoc ? nextDoc.queuePos : null;

    const { newPos: calculatedPos, needsRebalance } = calculateNewQueuePos(prevPos, nextPos);
    let newPos = calculatedPos;

    if (needsRebalance) {
      // Fetch all topics in queue order
      const allTopics = await topicsCollection
        .find({}, { projection: { _id: 1 } })
        .sort({ queuePos: 1 })
        .toArray();

      // Renumber 1000, 2000, 3000...
      const bulkOps = allTopics.map((topic, index) => ({
        updateOne: {
          filter: { _id: topic._id },
          update: { $set: { queuePos: (index + 1) * 1000 } },
        },
      }));

      if (bulkOps.length > 0) {
        await topicsCollection.bulkWrite(bulkOps);
      }

      // Re-fetch neighbors
      prevDoc = prevId
        ? await topicsCollection.findOne({ _id: new ObjectId(prevId) })
        : null;
      nextDoc = nextId
        ? await topicsCollection.findOne({ _id: new ObjectId(nextId) })
        : null;

      prevPos = prevDoc ? prevDoc.queuePos : null;
      nextPos = nextDoc ? nextDoc.queuePos : null;
      newPos = calculateNewQueuePos(prevPos, nextPos).newPos;
    }

    await topicsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { queuePos: newPos, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, queuePos: newPos });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
