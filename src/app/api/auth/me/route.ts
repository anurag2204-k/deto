import { NextRequest, NextResponse } from 'next/server';
import { isRequestOwner } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const isOwner = isRequestOwner(request);
  return NextResponse.json({ isOwner });
}
