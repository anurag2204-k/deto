import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { getBucket } from '@/lib/mongodb';
import { requireOwner } from '@/lib/auth';
import { ALLOWED_MIME, MAX_FILE_BYTES } from '@/lib/types';

export async function POST(request: NextRequest) {
  const authError = requireOwner(request);
  if (authError) return authError;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing or invalid file field' }, { status: 400 });
  }

  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: `Disallowed file type: ${file.type}. Allowed: PDF and images (PNG, JPEG, WebP, GIF)` },
      { status: 415 }
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: 'File size exceeds maximum limit of 20MB' },
      { status: 413 }
    );
  }

  try {
    const bucket = await getBucket();
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        type: file.type,
        size: file.size,
      },
    });

    const webStream = file.stream();
    // Convert Web ReadableStream to Node Readable
    const nodeReadable = Readable.fromWeb(webStream as unknown as import('stream/web').ReadableStream);

    await new Promise<void>((resolve, reject) => {
      nodeReadable.pipe(uploadStream)
        .on('finish', () => resolve())
        .on('error', (err) => reject(err));
    });

    return NextResponse.json({
      fileId: uploadStream.id.toString(),
      name: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
