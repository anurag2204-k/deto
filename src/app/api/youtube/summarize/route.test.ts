import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as youtubeLib from '@/lib/youtube';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { signSession } from '@/lib/auth';

describe('YouTube Summarize API Route', () => {
  const secret = 'test-secret-key-that-is-at-least-32-chars-long';
  let authCookie: string;

  beforeEach(() => {
    process.env.AUTH_SECRET = secret;
    const token = signSession();
    authCookie = `deto_session=${token}`;
  });

  it('returns 401 Unauthorized when no owner session is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/youtube/summarize', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=DHjqpvDnNGE' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 when body has no url or transcript', async () => {
    const req = new NextRequest('http://localhost:3000/api/youtube/summarize', {
      method: 'POST',
      headers: { cookie: authCookie },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Either "url"');
  });

  it('returns 400 for invalid YouTube URL format', async () => {
    const req = new NextRequest('http://localhost:3000/api/youtube/summarize', {
      method: 'POST',
      headers: { cookie: authCookie },
      body: JSON.stringify({ url: 'https://example.com/not-youtube' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid YouTube URL');
  });

  it('handles step="transcript" with a valid video ID when authenticated', async () => {
    vi.spyOn(youtubeLib, 'fetchYouTubeTranscript').mockResolvedValueOnce({
      videoId: 'DHjqpvDnNGE',
      fullText: 'Sample test transcript for unit tests.',
      segments: [{ text: 'Sample test', duration: 2, offset: 0 }],
    });

    const req = new NextRequest('http://localhost:3000/api/youtube/summarize', {
      method: 'POST',
      headers: { cookie: authCookie },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=DHjqpvDnNGE',
        step: 'transcript',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.step).toBe('transcript');
    expect(json.videoId).toBe('DHjqpvDnNGE');
    expect(typeof json.transcript).toBe('string');
    expect(json.segmentsCount).toBeGreaterThan(0);
  });
});
