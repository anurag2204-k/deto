import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth';
import {
  extractYouTubeVideoId,
  fetchYouTubeTranscript,
  summarizeTranscript,
} from '@/lib/youtube';

export async function POST(request: NextRequest) {
  const authError = requireOwner(request);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload. Please provide a JSON body with a "url" or "transcript".' },
      { status: 400 }
    );
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const inputTranscript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
  const step = typeof body.step === 'string' ? body.step.trim().toLowerCase() : 'all';
  const requestedModel = typeof body.model === 'string' ? body.model.trim() : undefined;

  // Validate inputs
  if (!url && !inputTranscript) {
    return NextResponse.json(
      { error: 'Either "url" (YouTube video link) or "transcript" text must be provided.' },
      { status: 400 }
    );
  }

  let videoId: string | null = null;
  if (url) {
    videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL or video ID format. Supported formats: youtube.com/watch?v=..., youtu.be/..., shorts/..., or 11-char ID.' },
        { status: 400 }
      );
    }
  }

  try {
    // ----------------------------------------------------
    // STEP 1: Fetch Transcript
    // ----------------------------------------------------
    let transcriptText = inputTranscript;
    let segments: Array<{ text: string; offset: number; duration: number }> = [];

    if (!transcriptText && videoId) {
      const transcriptData = await fetchYouTubeTranscript(videoId);
      transcriptText = transcriptData.fullText;
      segments = transcriptData.segments;
    }

    // If caller only requested Step 1 (transcript)
    if (step === 'transcript') {
      return NextResponse.json({
        success: true,
        step: 'transcript',
        videoId,
        transcript: transcriptText,
        segmentsCount: segments.length,
        segments,
      });
    }

    if (!transcriptText) {
      return NextResponse.json(
        { error: 'No transcript text available to summarize.' },
        { status: 400 }
      );
    }

    // ----------------------------------------------------
    // STEP 2: Summarize via OpenRouter Free Tier
    // ----------------------------------------------------
    const { summary, modelUsed } = await summarizeTranscript(transcriptText, {
      model: requestedModel,
    });

    // If caller only requested Step 2
    if (step === 'summary') {
      return NextResponse.json({
        success: true,
        step: 'summary',
        videoId,
        modelUsed,
        summary,
      });
    }

    // Default: Return both Step 1 and Step 2 results
    return NextResponse.json({
      success: true,
      step: 'all',
      videoId,
      modelUsed,
      summary,
      transcript: transcriptText,
      segmentsCount: segments.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    const status = message.includes('disabled or unavailable') ? 422 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}
