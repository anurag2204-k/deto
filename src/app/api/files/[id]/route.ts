import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { getBucket } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { isValidObjectId } from '@/lib/validate';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
  }

  try {
    const bucket = await getBucket();
    const fileId = new ObjectId(id);

    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileDoc = files[0];
    const metadata = fileDoc.metadata as { type?: string } | undefined;
    const contentType = metadata?.type || 'application/octet-stream';
    const downloadStream = bucket.openDownloadStream(fileId);

    // Convert Node Readable to Web ReadableStream
    const webStream = Readable.toWeb(downloadStream);

    return new Response(webStream as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Content-Length': String(fileDoc.length),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireOwner(request);
  if (authError) return authError;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
  }

  try {
    const bucket = await getBucket();
    await bucket.delete(new ObjectId(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
