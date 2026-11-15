import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { isValidObjectId } from '@/lib/validate';
import { RingColor, RingFrequency, TopicDoc, serializeLightweightTopic } from '@/lib/types';

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

  let body: {
    active: boolean;
    frequency?: RingFrequency;
    targetDays?: number;
    targetPeriod?: 'week' | 'month';
    color?: RingColor;
    lastStudiedAt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const topicsCollection = db.collection<TopicDoc>('topics');

    const topic = await topicsCollection.findOne({ _id: new ObjectId(id) });
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const ringUpdate = {
      active: Boolean(body.active),
      frequency: body.frequency || topic.ring?.frequency || 'daily',
      targetDays: body.targetDays !== undefined ? body.targetDays : topic.ring?.targetDays,
      targetPeriod: body.targetPeriod || topic.ring?.targetPeriod,
      color: body.color || topic.ring?.color || 'amber',
      lastStudiedAt: body.lastStudiedAt !== undefined ? body.lastStudiedAt : topic.ring?.lastStudiedAt,
      sessionsCount: topic.ring?.sessionsCount || 0,
      history: topic.ring?.history || (topic.ring?.lastStudiedAt ? [topic.ring.lastStudiedAt] : []),
    };

    await topicsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ring: ringUpdate, updatedAt: new Date() } }
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
