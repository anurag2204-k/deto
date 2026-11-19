import { YoutubeTranscript } from 'youtube-transcript';

export interface TranscriptSegment {
  text: string;
  duration: number;
  offset: number;
}

export interface TranscriptResult {
  videoId: string;
  fullText: string;
  segments: TranscriptSegment[];
}

export interface SummarizeResult {
  videoId?: string;
  transcript?: string;
  summary: string;
  modelUsed: string;
}

const DEFAULT_FREE_MODELS = [
  'cohere/north-mini-code:free',
  'nvidia/nemotron-3.5-lightning:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'inclusionai/ling-3.2-flash:free',
];

/**
 * Extracts the 11-character YouTube video ID from various URL formats.
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex for standard, short, embed, shorts, and live URLs
  const regex = /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|v\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regex);
  return match ? match[1] : null;
}

/**
 * Fetches the transcript for a given YouTube video ID or URL.
 */
export async function fetchYouTubeTranscript(videoIdOrUrl: string): Promise<TranscriptResult> {
  const videoId = extractYouTubeVideoId(videoIdOrUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL or video ID provided.');
  }

  try {
    const rawSegments = await YoutubeTranscript.fetchTranscript(videoId);

    if (!rawSegments || rawSegments.length === 0) {
      throw new Error('No transcript or captions found for this video.');
    }

    const segments: TranscriptSegment[] = rawSegments.map((item) => ({
      text: decodeHtmlEntities(item.text.trim()),
      duration: Math.round(item.duration),
      offset: Math.round(item.offset),
    }));

    // Group into readable paragraphs roughly every 30-45 seconds or sentence boundaries
    const fullText = segments
      .map((s) => s.text)
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ');

    return {
      videoId,
      fullText,
      segments,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Could not find captions') || message.includes('disabled')) {
      throw new Error(`Captions are disabled or unavailable for YouTube video (${videoId}).`);
    }
    throw new Error(`Failed to fetch YouTube transcript: ${message}`);
  }
}

/**
 * Decodes HTML entities commonly found in YouTube subtitles (e.g. &amp;, &#39;, &quot;).
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/**
 * Summarizes the transcript using OpenRouter free-tier LLM models.
 */
export async function summarizeTranscript(
  transcriptText: string,
  options?: {
    model?: string;
    apiKey?: string;
  }
): Promise<{ summary: string; modelUsed: string }> {
  const apiKey = options?.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API key is missing. Set OPENROUTER_API_KEY in your environment.');
  }

  const systemPrompt = `You are an expert technical tutor. Your task is to explain the topic covered in the YouTube video transcript clearly, concisely, and deeply—like ChatGPT or Gemini explaining a technical subject in Notion-ready Markdown.

Style & Formatting Rules:
1. Tone & Format:
   - Direct, informative, and high-density. No fluff, conversational filler, meta-announcements ('In this video...'), or redundant closing summaries.
   - Use clean Markdown sections with '## Section Name' followed by informative, well-structured bullet points.
   - Bold key terms and use inline code for syntax, functions, APIs, and commands.

2. Visual Markdown Diagrams:
   - Provide clean, valid Mermaid diagrams (\`\`\`mermaid ... \`\`\`) to visualize workflows, architectures, data lifecycles, or relationships whenever applicable.
   - Keep Mermaid syntax standard and clean (e.g., flowchart TD or flowchart LR) with quoted node labels to ensure Notion compatibility.

3. Code & Implementation:
   - Provide clean, complete, syntactically valid code blocks with language identifiers (\`\`\`typescript, \`\`\`python, \`\`\`javascript, \`\`\`bash, etc.).
   - Include 1-2 sharp bullet points beneath each code block highlighting practical mechanics.

4. Factors, Gotchas & What Affects It:
   - Dedicate a section to factors that affect this topic: performance bottlenecks, common traps, edge cases, configuration pitfalls, or architectural trade-offs.

5. Conciseness:
   - Keep it dense and informative—not overly verbose, but thoroughly instructional.
   - Do NOT add a mandatory summary table or conclusion paragraph at the end.`;

  const userPrompt = `Explain the topic covered in this transcript thoroughly and concisely in section format with bullet points, code snippets, visual diagrams, and gotchas:\n\n${transcriptText}`;

  // Candidate models to try in order (custom model first if specified, then reliable free models)
  const candidateModels = options?.model
    ? [options.model, ...DEFAULT_FREE_MODELS]
    : DEFAULT_FREE_MODELS;

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://deto.app',
          'X-Title': 'Deto YouTube Summarizer',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // If rate limited (429) or service unavailable (503/404), fall back to next model
        if (response.status === 429 || response.status === 503 || response.status === 404) {
          lastError = new Error(`Model ${model} returned ${response.status}: ${errorText}`);
          continue;
        }
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        lastError = new Error(`Model ${model} returned empty response.`);
        continue;
      }

      return {
        summary: content,
        modelUsed: model,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Continue to next candidate model
    }
  }

  throw new Error(
    `Failed to generate summary with all attempted models. Last error: ${lastError?.message || 'Unknown error'}`
  );
}
