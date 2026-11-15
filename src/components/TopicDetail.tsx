'use client';

import { Topic } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ExternalLink, FileText } from 'lucide-react';

interface TopicDetailProps {
  topic: Topic;
  fontSize?: 'normal' | 'large';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(type: string): boolean {
  return type.startsWith('image/');
}

export function TopicDetail({ topic, fontSize = 'normal' }: TopicDetailProps) {
  // Check which files are not already linked in the markdown text
  const notesText = topic.notes || '';
  const unlinkedFiles = (topic.files || []).filter(
    (f) => !notesText.includes(f.fileId)
  );

  return (
    <div className="space-y-8">
      {/* Markdown Notes (with inline images, inline PDFs, styled code blocks) */}
      {topic.notes ? (
        <div className="rounded-2xl border border-white/10 p-6 sm:p-8 bg-zinc-950/70 shadow-inner">
          <MarkdownRenderer content={topic.notes} fontSize={fontSize} />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 p-8 text-center text-zinc-500 italic text-sm">
          No notes logged for this topic yet. Click &ldquo;Edit Notes&rdquo; to add detailed notes, code, diagrams, or file attachments.
        </div>
      )}

      {/* External References & Links */}
      {topic.links && topic.links.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            References &amp; Links ({topic.links.length})
          </h4>
          <div className="flex flex-wrap gap-2.5">
            {topic.links.map((link, idx) => {
              let domain = '';
              try {
                domain = new URL(link.url).hostname.replace('www.', '');
              } catch {
                domain = link.label;
              }

              return (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border border-white/10 bg-zinc-900/60 hover:bg-zinc-800/90 hover:border-indigo-500/50 text-zinc-200 transition-all duration-150 shadow-xs group"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[220px]">{link.label || domain}</span>
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal bg-zinc-800 text-zinc-400 border-none">
                    {domain}
                  </Badge>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Additional Files & Attachments (unlinked in text or full gallery) */}
      {unlinkedFiles.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Attached Files &amp; Resources ({unlinkedFiles.length})
          </h4>

          {/* Image thumbnails */}
          {unlinkedFiles.some((f) => isImageFile(f.type)) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {unlinkedFiles
                .filter((f) => isImageFile(f.type))
                .map((file) => (
                  <a
                    key={file.fileId}
                    href={`/api/files/${file.fileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block aspect-video rounded-xl overflow-hidden border border-white/10 bg-zinc-900 hover:border-indigo-500/50 transition-all duration-150"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/files/${file.fileId}`}
                      alt={file.name}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-white">
                      <p className="text-[11px] font-medium truncate">{file.name}</p>
                      <p className="text-[9px] text-zinc-400">{formatBytes(file.size)}</p>
                    </div>
                  </a>
                ))}
            </div>
          )}

          {/* PDFs and other documents */}
          {unlinkedFiles.some((f) => !isImageFile(f.type)) && (
            <div className="flex flex-wrap gap-2">
              {unlinkedFiles
                .filter((f) => !isImageFile(f.type))
                .map((file) => (
                  <a
                    key={file.fileId}
                    href={`/api/files/${file.fileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'h-auto py-2.5 px-3.5 text-xs justify-start gap-2.5 border-white/10 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 hover:border-indigo-500/40 rounded-xl shadow-xs'
                    )}
                  >
                    <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="text-left">
                      <div className="font-medium truncate max-w-[220px]">{file.name}</div>
                      <div className="text-[10px] text-zinc-400">{formatBytes(file.size)}</div>
                    </div>
                  </a>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
