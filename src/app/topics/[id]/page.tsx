'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { NoteEditor } from '@/components/NoteEditor';
import { TopicDetail } from '@/components/TopicDetail';
import { TopicArtwork, TopicCategoryBadge } from '@/components/TopicArtwork';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getTopic,
  updateTopic,
  deleteTopic,
  getMe,
  queueDone,
  revisionDone,
} from '@/lib/api';
import { Topic, TopicFile, TopicLink, RingSettings } from '@/lib/types';
import {
  ArrowLeft,
  Calendar,
  Edit3,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Clock,
  BookOpen,
  List,
  Type,
  Share2,
  Check,
} from 'lucide-react';

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

function extractHeadings(markdown: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    const match = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      headings.push({ id, text, level });
    }
  }

  return headings;
}

function TopicDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    getMe().then((res) => setIsOwner(res.isOwner)).catch(() => setIsOwner(false));

    getTopic(id)
      .then((data) => {
        setTopic(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load topic');
        setLoading(false);
      });
  }, [id]);

  const headings = topic?.notes ? extractHeadings(topic.notes) : [];
  const words = topic?.notes ? topic.notes.trim().split(/\s+/).filter(Boolean).length : 0;
  const readMinutes = Math.max(1, Math.ceil(words / 200));

  const handleSave = async (data: {
    title: string;
    studiedOn: string;
    notes?: string;
    links: TopicLink[];
    files: TopicFile[];
    ring?: RingSettings;
  }) => {
    const updated = await updateTopic(id, data);
    setTopic(updated);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm(`Permanently delete "${topic?.title}"?`)) {
      await deleteTopic(id);
      router.push('/');
    }
  };

  const handleQueueDone = async () => {
    if (!topic) return;
    try {
      await queueDone(topic._id);
      const updated = await getTopic(id);
      setTopic(updated);
      setActionFeedback('Topic successfully cycled to the bottom of the queue rotation!');
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setError('Failed to cycle topic to bottom');
    }
  };

  const handleRevisionDone = async () => {
    if (!topic) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      await revisionDone(topic._id, today);
      const updated = await getTopic(id);
      setTopic(updated);
      setActionFeedback(`Revision completed! Rescheduled for Stage ${updated.revision.stage} (due on ${updated.revision.nextDueAt}).`);
      setTimeout(() => setActionFeedback(null), 3500);
    } catch {
      setError('Failed to record revision completion');
    }
  };

  const copyPageLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const scrollToHeading = (headingId: string) => {
    const el = document.getElementById(headingId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090a10] text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Opening study note...</span>
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#090a10] text-zinc-400 gap-4 p-4 text-center">
        <p className="text-red-400 text-sm">{error || 'Topic not found'}</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  if (isEditing && isOwner) {
    return (
      <NoteEditor
        initialTopic={topic}
        isEditing={true}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#090a10] text-[#f8fafc] selection:bg-indigo-500/30">
      {/* Top sticky Reader bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090a10]/90 backdrop-blur-xl px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="gap-1 sm:gap-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 px-2 sm:px-3 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Queue</span>
            </Button>
            <span className="text-zinc-600">/</span>
            <span className="text-xs text-zinc-400 truncate max-w-[100px] xs:max-w-[150px] sm:max-w-[280px]">
              {topic.title}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Font size control */}
            <button
              type="button"
              onClick={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')}
              className="p-1.5 rounded-lg border border-white/5 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs flex items-center gap-1"
              title="Toggle Reading Font Size"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono">{fontSize === 'normal' ? '16px' : '18px'}</span>
            </button>

            {/* Share link button */}
            <button
              type="button"
              onClick={copyPageLink}
              className="p-1.5 rounded-lg border border-white/5 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs"
              title="Copy link to note"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>

            {isOwner && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleQueueDone}
                  className="h-8 text-xs border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 gap-1.5 hidden md:flex"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Cycle to Bottom</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleRevisionDone}
                  className="h-8 text-xs bg-emerald-600/90 hover:bg-emerald-600 text-white gap-1.5 hidden md:flex"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Revision Done</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 px-2.5 sm:px-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1 sm:gap-1.5 shadow-sm shadow-indigo-600/30"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span><span className="hidden sm:inline">Edit </span>Note</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-8 px-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                  title="Delete Topic"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4">
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-200 text-xs flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{actionFeedback}</span>
          </div>
        </div>
      )}

      {/* Main Reader Layout with Outline Navigation */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-8 flex flex-col lg:flex-row gap-6 sm:gap-10">
        {/* Sticky Table of Contents Sidebar (Desktop) */}
        {headings.length > 0 && (
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-20 space-y-4 p-4 rounded-2xl border border-white/5 bg-zinc-950/40 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <List className="w-3.5 h-3.5 text-indigo-400" />
                <span>Table of Contents</span>
              </div>

              <nav className="space-y-1 max-h-[60vh] overflow-y-auto text-xs">
                {headings.map((h, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToHeading(h.id)}
                    className={`block w-full text-left truncate py-1 text-zinc-400 hover:text-indigo-300 transition-colors ${
                      h.level === 1 ? 'font-semibold text-zinc-200' : h.level === 2 ? 'pl-3' : 'pl-6 text-zinc-500'
                    }`}
                  >
                    {h.text}
                  </button>
                ))}
              </nav>

              {/* Study Stats Widget */}
              <div className="pt-4 border-t border-white/5 text-[11px] text-zinc-500 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>Reading time:</span>
                  <span className="text-zinc-300">{readMinutes} min read</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total words:</span>
                  <span className="text-zinc-300">{words.toLocaleString()} words</span>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Reader Canvas Column */}
        <main className="flex-1 max-w-3xl min-w-0 space-y-8 mx-auto">
          {/* Article Header */}
          <div className="flex flex-col sm:flex-row items-start gap-5 border-b border-white/10 pb-8">
            <TopicArtwork
              title={topic.title}
              notes={topic.notes}
              imageUrl={
                topic.files?.find((f) => f.type.startsWith('image/'))
                  ? `/api/files/${topic.files.find((f) => f.type.startsWith('image/'))?.fileId}`
                  : undefined
              }
              size="lg"
            />

            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <TopicCategoryBadge title={topic.title} notes={topic.notes} />

                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs px-2.5 py-0.5">
                  Stage {topic.revision.stage}
                </Badge>

                <span className="text-xs text-zinc-500">•</span>

                <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  {topic.studiedOn}
                </span>

                <span className="text-xs text-zinc-500">•</span>

                <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Next Due: <strong className="text-indigo-300">{topic.revision.nextDueAt}</strong>
                </span>

                <span className="text-xs text-zinc-500 hidden sm:inline">•</span>

                <span className="text-xs text-zinc-500 flex items-center gap-1 hidden sm:inline-flex">
                  <BookOpen className="w-3 h-3 text-zinc-500" />
                  {readMinutes} min read
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {topic.title}
              </h1>
            </div>
          </div>

          {/* Rendered Notes with Inline Images, Inline PDFs, and Live Links */}
          <article className="space-y-6">
            <TopicDetail topic={topic} fontSize={fontSize} />
          </article>
        </main>
      </div>
    </div>
  );
}

export default function TopicDetailPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#090a10] text-zinc-400">
          Loading topic notes...
        </div>
      }
    >
      <TopicDetailContent {...props} />
    </Suspense>
  );
}
