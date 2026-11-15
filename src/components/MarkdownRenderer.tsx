'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ExternalLink, FileText, Check, Copy, Maximize2 } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  fontSize?: 'normal' | 'large';
  onHeadingsExtracted?: (headings: Array<{ id: string; text: string; level: number }>) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function MarkdownRenderer({
  content,
  fontSize = 'normal',
}: MarkdownRendererProps) {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const isPdf = (url: string) => url.toLowerCase().endsWith('.pdf') || url.includes('/api/files/');

  return (
    <div
      className={`prose prose-invert max-w-none leading-relaxed text-zinc-300 ${
        fontSize === 'large' ? 'text-lg leading-loose' : 'text-base leading-relaxed'
      }`}
    >
      <ReactMarkdown
        components={{
          h1: ({ children, ...props }) => {
            const text = String(children);
            const id = slugify(text);
            return (
              <h1
                id={id}
                className="scroll-mt-20 text-2xl sm:text-3xl font-extrabold text-white border-b border-white/10 pb-3 mt-8 mb-5 tracking-tight"
                {...props}
              >
                {children}
              </h1>
            );
          },
          h2: ({ children, ...props }) => {
            const text = String(children);
            const id = slugify(text);
            return (
              <h2
                id={id}
                className="scroll-mt-20 text-xl sm:text-2xl font-bold text-indigo-300 border-b border-white/5 pb-2 mt-8 mb-4 tracking-tight"
                {...props}
              >
                {children}
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const text = String(children);
            const id = slugify(text);
            return (
              <h3
                id={id}
                className="scroll-mt-20 text-lg sm:text-xl font-semibold text-zinc-100 mt-6 mb-3"
                {...props}
              >
                {children}
              </h3>
            );
          },
          p: ({ children, ...props }) => (
            <p className="text-zinc-300 leading-relaxed mb-5" {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-outside ml-6 space-y-2 text-zinc-300 mb-5" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-outside ml-6 space-y-2 text-zinc-300 mb-5" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-zinc-300 pl-1" {...props}>
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-indigo-500 bg-indigo-950/20 rounded-r-xl px-5 py-3 text-zinc-200 italic my-6 shadow-xs"
              {...props}
            >
              {children}
            </blockquote>
          ),
          img: ({ src, alt, ...props }) => {
            const srcString = typeof src === 'string' ? src : '';
            if (!srcString) return null;
            return (
              <figure className="my-8 rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl group">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={srcString}
                    alt={alt || 'Embedded image'}
                    className="w-full max-h-[550px] object-contain mx-auto bg-black/60 rounded-t-2xl"
                    loading="lazy"
                    {...props}
                  />
                  <a
                    href={srcString}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-3 right-3 p-2 rounded-lg bg-black/70 hover:bg-black text-white/80 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Open full image in new tab"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </a>
                </div>
                {alt && (
                  <figcaption className="text-center text-xs text-zinc-400 py-2.5 px-4 bg-zinc-900/60 border-t border-white/5 font-medium">
                    {alt}
                  </figcaption>
                )}
              </figure>
            );
          },
          a: ({ href, children, ...props }) => {
            if (!href) return <span>{children}</span>;

            // Check if link points to an uploaded file / PDF
            if (isPdf(href)) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-200 text-xs font-medium my-1 no-underline transition-all hover:border-indigo-400 shadow-xs"
                  {...props}
                >
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-medium underline decoration-indigo-400/50 underline-offset-2">
                    {children}
                  </span>
                  <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0 ml-1" />
                </a>
              );
            }

            // Regular web link
            let domain = '';
            try {
              domain = new URL(href).hostname.replace('www.', '');
            } catch {
              domain = '';
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-baseline gap-1 text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-500/40 hover:decoration-indigo-300 transition-colors font-medium"
                {...props}
              >
                <span>{children}</span>
                {domain && (
                  <span className="text-[10px] text-zinc-500 font-mono no-underline">
                    ({domain})
                  </span>
                )}
                <ExternalLink className="w-3 h-3 inline shrink-0 self-center opacity-70 ml-0.5" />
              </a>
            );
          },
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(className);
            const codeString = String(children).replace(/\n$/, '');
            const codeId = String(Math.random());

            if (!isBlock) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-zinc-800/80 border border-white/10 text-indigo-300 font-mono text-xs font-normal"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';

            return (
              <div className="relative my-6 rounded-xl overflow-hidden border border-white/10 bg-[#07080d] shadow-lg group">
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/60 border-b border-white/5 text-xs text-zinc-400">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-indigo-400">
                    {lang || 'code'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCode(codeString, codeId)}
                    className="flex items-center gap-1.5 text-[11px] hover:text-white transition-colors p-1"
                  >
                    {copiedCodeId === codeId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-zinc-200 leading-relaxed bg-transparent m-0">
                  <code>{children}</code>
                </pre>
              </div>
            );
          },
          table: ({ children, ...props }) => (
            <div className="my-6 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs sm:text-sm text-zinc-300" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-zinc-900/80 border-b border-white/10 text-zinc-200 font-semibold" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th className="px-4 py-3" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-4 py-3 border-t border-white/5" {...props}>
              {children}
            </td>
          ),
          hr: ({ ...props }) => (
            <hr className="my-8 border-white/10" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
