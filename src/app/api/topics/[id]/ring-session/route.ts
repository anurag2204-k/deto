import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { isValidObjectId, isValidDateString } from '@/lib/validate';
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

  let body: { today?: string } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const todayStr =
    body.today && isValidDateString(body.today)
      ? body.today
      : new Date().toISOString().split('T')[0];

  try {
    const db = await getDb();
    const topicsCollection = db.collection<TopicDoc>('topics');

    const topic = await topicsCollection.findOne({ _id: new ObjectId(id) });
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const currentSessions = topic.ring?.sessionsCount || 0;
    const currentHistory = Array.isArray(topic.ring?.history) ? topic.ring.history : [];
    const updatedHistory = currentHistory.includes(todayStr)
      ? currentHistory
      : [...currentHistory, todayStr];

    const ringUpdate = {
      active: true,
      frequency: topic.ring?.frequency || 'daily',
      targetDays: topic.ring?.targetDays,
      targetPeriod: topic.ring?.targetPeriod,
      color: topic.ring?.color || 'amber',
      lastStudiedAt: todayStr,
      sessionsCount: currentSessions + 1,
      history: updatedHistory,
    };

    await topicsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ring: ringUpdate,
          studiedOn: todayStr, // Also keep studiedOn fresh
          updatedAt: new Date(),
        },
      }
    );

    // Record activity for today (Ring = Yellow)
    await db.collection('activity').updateOne(
      { date: todayStr },
      { $set: { ring: true, updatedAt: new Date() }, $inc: { count: 1 } },
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
