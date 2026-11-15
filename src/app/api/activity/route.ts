import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { isValidDateString } from '@/lib/validate';
import { ActivityDoc, ActivityMap, TopicDoc } from '@/lib/types';

export async function GET() {
  try {
    const db = await getDb();
    const activityCollection = db.collection<ActivityDoc>('activity');
    const topicsCollection = db.collection<TopicDoc>('topics');

    const activityDocs = await activityCollection.find({}).toArray();

    // If activity collection is empty, backfill from existing topics
    if (activityDocs.length === 0) {
      const allTopics = await topicsCollection.find({}).toArray();
      const initialMap: ActivityMap = {};

      for (const t of allTopics) {
        if (t.studiedOn) {
          if (!initialMap[t.studiedOn]) {
            initialMap[t.studiedOn] = { queue: false, ring: false, count: 0 };
          }
          initialMap[t.studiedOn].queue = true;
          initialMap[t.studiedOn].count = (initialMap[t.studiedOn].count || 0) + 1;
        }

        if (t.ring?.active && t.ring.lastStudiedAt) {
          if (!initialMap[t.ring.lastStudiedAt]) {
            initialMap[t.ring.lastStudiedAt] = { queue: false, ring: false, count: 0 };
          }
          initialMap[t.ring.lastStudiedAt].ring = true;
          initialMap[t.ring.lastStudiedAt].count = (initialMap[t.ring.lastStudiedAt].count || 0) + 1;
        }
      }

      // Persist backfill
      const inserts = Object.entries(initialMap).map(([date, val]) => ({
        date,
        queue: val.queue,
        ring: val.ring,
        count: val.count,
        updatedAt: new Date(),
      }));

      if (inserts.length > 0) {
        await activityCollection.insertMany(inserts as ActivityDoc[]);
      }

      return NextResponse.json(initialMap);
    }

    const resultMap: ActivityMap = {};
    for (const doc of activityDocs) {
      resultMap[doc.date] = {
        queue: doc.queue,
        ring: doc.ring,
        count: doc.count || ((doc.queue ? 1 : 0) + (doc.ring ? 1 : 0)),
      };
    }

    return NextResponse.json(resultMap);
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

  let body: { date?: string; type?: 'queue' | 'ring' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { date, type } = body;
  if (!date || !isValidDateString(date) || (type !== 'queue' && type !== 'ring')) {
    return NextResponse.json(
      { error: 'Valid date (YYYY-MM-DD) and type ("queue" | "ring") required' },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const activityCollection = db.collection<ActivityDoc>('activity');

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (type === 'queue') {
      updateFields.queue = true;
    }
    if (type === 'ring') {
      updateFields.ring = true;
    }

    await activityCollection.updateOne(
      { date },
      {
        $set: updateFields,
        $inc: { count: 1 },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, date, type });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
