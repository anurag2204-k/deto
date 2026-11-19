'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LoginDialog } from '@/components/LoginDialog';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { AtmosphericBackdrop } from '@/components/AtmosphericBackdrop';
import { getMe, logout } from '@/lib/api';
import {
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  Play,
  FileText,
  CornerDownLeft,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lock,
  LogIn,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

interface SummarizeResponse {
  success: boolean;
  step: string;
  videoId: string;
  modelUsed?: string;
  summary?: string;
  transcript?: string;
  segmentsCount?: number;
  error?: string;
}

export default function SummarizePage() {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'captions' | 'ai'>('captions');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SummarizeResponse | null>(null);
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [showTranscript, setShowTranscript] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await getMe();
      setIsOwner(res.isOwner);
    } catch {
      setIsOwner(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isOwner) {
      inputRef.current?.focus();
    }
  }, [isOwner]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOwner(false);
      setResult(null);
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const handleSummarize = async (overrideUrl?: string) => {
    if (!isOwner) {
      setLoginOpen(true);
      return;
    }

    const targetUrl = (overrideUrl || url).trim();
    if (!targetUrl) return;

    setLoading(true);
    setLoadingPhase('captions');
    setError(null);
    setResult(null);

    const timer = setTimeout(() => {
      setLoadingPhase('ai');
    }, 1200);

    try {
      const res = await fetch('/api/youtube/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (res.status === 401) {
        setIsOwner(false);
        setLoginOpen(true);
        throw new Error('Session expired or unauthorized. Please sign in as anurag.');
      }

      const data: SummarizeResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to summarize video');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while summarizing.');
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      handleSummarize();
    }
  };

  const handleCopy = async () => {
    if (!result?.summary) return;
    try {
      await navigator.clipboard.writeText(result.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090a10] text-slate-900 dark:text-[#f8fafc] flex flex-col relative transition-colors duration-200">
      <AtmosphericBackdrop />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between bg-white/80 dark:bg-[#090a10]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-white/5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="h-8 px-2.5 text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-lg gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />

          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-600 via-red-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-rose-500/20">
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                Summarize Transcript
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 font-medium">
                  AI Notes
                </Badge>
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Action Items */}
        <div className="flex items-center gap-2">
          {result?.summary && (
            <Button
              onClick={handleCopy}
              size="sm"
              className={`h-8 px-3 text-xs font-medium rounded-xl gap-1.5 transition-all ${
                copied
                  ? 'bg-emerald-600 text-white hover:bg-emerald-600 shadow-emerald-600/20 shadow-md'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 shadow-md'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied for Notion!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy for Notion</span>
                </>
              )}
            </Button>
          )}

          {/* Authentication Badge / Login Button */}
          {isOwner === true ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                A
              </div>
              <span className="font-semibold text-slate-800 dark:text-zinc-200 text-xs hidden sm:inline">anurag</span>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="text-slate-400 hover:text-rose-500 transition-colors p-0.5 ml-0.5"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : isOwner === false ? (
            <Button
              size="sm"
              onClick={() => setLoginOpen(true)}
              className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 rounded-xl font-medium shadow-sm shadow-indigo-600/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Owner Login</span>
            </Button>
          ) : null}

          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col z-10">
        {/* Auth Loading Spinner */}
        {isOwner === null && (
          <div className="my-auto py-20 text-center">
            <Loader2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 dark:text-zinc-500">Checking credentials...</p>
          </div>
        )}

        {/* LOCKED STATE: Not signed in as anurag */}
        {isOwner === false && (
          <div className="my-auto py-12 sm:py-16 text-center max-w-md mx-auto">
            <div className="inline-flex items-center justify-center p-3 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Owner Sign-In Required
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed mb-6">
              The YouTube Transcript Synthesizer uses OpenRouter AI and is restricted to user <strong className="text-indigo-600 dark:text-indigo-400">anurag</strong>. Please sign in to access this feature.
            </p>

            <Button
              onClick={() => setLoginOpen(true)}
              className="h-10 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl gap-2 font-medium shadow-md shadow-indigo-600/20"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In as anurag</span>
            </Button>
          </div>
        )}

        {/* AUTHORIZED STATE: anurag is logged in */}
        {isOwner === true && (
          <>
            {/* ChatGPT-style Input Hero when no result exists */}
            {!result && !loading && (
              <div className="text-center my-auto py-8 sm:py-16">
                <div className="inline-flex items-center justify-center p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-red-500/10 via-indigo-500/10 to-purple-500/10 border border-slate-200 dark:border-white/10 mb-6 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/25">
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </div>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
                  YouTube Notes &amp; Code Synthesizer
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 max-w-lg mx-auto mb-8 leading-relaxed">
                  Paste any YouTube video link to extract its transcript, explain the core concepts, generate visual flow diagrams, and construct working code snippets ready for Notion.
                </p>

                {/* Input Form */}
                <div className="max-w-2xl mx-auto">
                  <div className="relative flex items-center rounded-2xl bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-white/10 shadow-lg shadow-indigo-500/5 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all p-1.5 sm:p-2">
                    <div className="pl-3 pr-2 text-slate-400 dark:text-zinc-500 flex items-center">
                      <Play className="w-4 h-4 text-rose-500 fill-current" />
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Paste YouTube link (e.g. https://www.youtube.com/watch?v=...) and press Enter"
                      className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none px-2 py-2"
                    />
                    <Button
                      onClick={() => handleSummarize()}
                      disabled={!url.trim() || loading}
                      className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl gap-2 font-medium shadow-md shadow-indigo-600/20 shrink-0"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="hidden sm:inline">Summarize</span>
                      <CornerDownLeft className="w-3.5 h-3.5 opacity-70 hidden sm:inline" />
                    </Button>
                  </div>

                  {/* Sample Quick-Click Chips */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-slate-500 dark:text-zinc-400">
                    <span>Try an example:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const sample = 'https://www.youtube.com/watch?v=DHjqpvDnNGE';
                        setUrl(sample);
                        handleSummarize(sample);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 font-mono text-[11px] transition-colors"
                    >
                      JavaScript in 100s
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sample = 'https://www.youtube.com/watch?v=zQnBQ4tB3ZA';
                        setUrl(sample);
                        handleSummarize(sample);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 font-mono text-[11px] transition-colors"
                    >
                      Python in 100s
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center my-auto py-16">
                <div className="relative w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 dark:bg-indigo-500/10 animate-ping" />
                  <div className="relative w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Sparkles className="w-7 h-7 animate-pulse" />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {loadingPhase === 'captions'
                    ? 'Step 1/2: Extracting video transcript...'
                    : 'Step 2/2: Synthesizing notes & code with AI...'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
                  {loadingPhase === 'captions'
                    ? 'Fetching subtitle tracks and timestamps directly from the video...'
                    : 'Structuring the concept explanation, generating flowcharts, and assembling code snippets...'}
                </p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="my-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold mb-1">Could not generate summary</p>
                  <p className="text-xs opacity-90">{error}</p>
                  <p className="text-xs mt-2 text-rose-600 dark:text-rose-400">
                    Tip: Make sure the YouTube video has subtitles/closed captions enabled (auto-generated or manual).
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                  className="text-xs h-7 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30"
                >
                  Dismiss
                </Button>
              </div>
            )}

            {/* Generated Summary View */}
            {result && (
              <div className="space-y-6">
                {/* Top Compact Bar to analyze another video */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-white/10 shadow-sm">
                  <div className="pl-3 text-slate-400 dark:text-zinc-500">
                    <Play className="w-4 h-4 text-rose-500 fill-current" />
                  </div>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Paste another YouTube link and press Enter..."
                    className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none px-2 py-1.5"
                  />
                  <Button
                    onClick={() => handleSummarize()}
                    disabled={!url.trim() || loading}
                    size="sm"
                    className="h-8 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs gap-1.5 font-medium shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Summarize</span>
                  </Button>
                </div>

                {/* Video Meta & Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 dark:bg-[#0f111a]/70 border border-slate-200/80 dark:border-white/5 backdrop-blur-md">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline" className="font-mono text-[11px] border-slate-200 dark:border-white/10">
                      ID: {result.videoId}
                    </Badge>
                    {result.modelUsed && (
                      <Badge variant="outline" className="text-[11px] text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20">
                        Model: {result.modelUsed.replace(':free', '')}
                      </Badge>
                    )}
                    {result.segmentsCount && (
                      <Badge variant="outline" className="text-[11px] text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-white/10">
                        {result.segmentsCount} caption segments
                      </Badge>
                    )}
                    <a
                      href={`https://www.youtube.com/watch?v=${result.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ml-1"
                    >
                      <span>Watch on YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* View Mode & Copy Button */}
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
                      <button
                        type="button"
                        onClick={() => setViewMode('rendered')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                          viewMode === 'rendered'
                            ? 'bg-white dark:bg-[#1a1c26] text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Formatted
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('raw')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                          viewMode === 'raw'
                            ? 'bg-white dark:bg-[#1a1c26] text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Raw Markdown
                      </button>
                    </div>

                    <Button
                      onClick={handleCopy}
                      size="sm"
                      className={`h-8 px-3 text-xs font-medium rounded-xl gap-1.5 transition-all ${
                        copied
                          ? 'bg-emerald-600 text-white hover:bg-emerald-600 shadow-md shadow-emerald-600/20'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy for Notion</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Content Display Card */}
                <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0f111a] border border-slate-200/80 dark:border-white/5 shadow-sm">
                  {viewMode === 'rendered' ? (
                    <MarkdownRenderer content={result.summary || ''} />
                  ) : (
                    <div className="relative">
                      <pre className="p-4 rounded-xl bg-slate-900 text-zinc-100 font-mono text-xs sm:text-sm overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {result.summary}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Bottom Copy Bar */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-[#0f111a]/70 border border-slate-200/80 dark:border-white/5">
                  <span className="text-xs text-slate-500 dark:text-zinc-400">
                    Ready to paste into your Notion workspace or study doc.
                  </span>
                  <Button
                    onClick={handleCopy}
                    size="sm"
                    className={`h-8 px-3.5 text-xs font-medium rounded-xl gap-1.5 transition-all ${
                      copied
                        ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy All Markdown</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Collapsible Transcript Section */}
                {result.transcript && (
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/50 dark:bg-[#0f111a]/50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowTranscript((prev) => !prev)}
                      className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <span>View Raw Extracted Video Transcript</span>
                      </div>
                      {showTranscript ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {showTranscript && (
                      <div className="p-5 border-t border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed max-h-96 overflow-y-auto">
                        {result.transcript}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Login Dialog */}
      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={checkAuth}
      />
    </div>
  );
}
