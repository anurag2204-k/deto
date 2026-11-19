'use client';

import { useRef, useEffect } from 'react';
import { TopicFile, TopicLink } from '@/lib/types';
import {
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  CheckSquare,
  Code,
  Quote,
  Minus,
  Paperclip,
} from 'lucide-react';

export interface CommandOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'media' | 'attached' | 'format';
  action: () => void;
}

export interface SlashCommandsConfig {
  trigger: '/' | '@';
  searchQuery: string;
  files: TopicFile[];
  links: TopicLink[];
  onUploadImageClick: () => void;
  onUploadPdfClick: () => void;
  onInsertLinkClick: () => void;
  onInsertFile: (file: TopicFile) => void;
  onInsertLink: (link: TopicLink) => void;
  onInsertMarkdown: (prefix: string, suffix?: string) => void;
}

export function getAvailableSlashCommands(config: SlashCommandsConfig): CommandOption[] {
  const {
    trigger,
    searchQuery,
    files,
    links,
    onUploadImageClick,
    onUploadPdfClick,
    onInsertLinkClick,
    onInsertFile,
    onInsertLink,
    onInsertMarkdown,
  } = config;

  const allOptions: CommandOption[] = [];

  // Media / Link uploading options
  allOptions.push({
    id: 'upload-image',
    title: 'Embed Image',
    description: 'Upload an image and embed it directly at cursor',
    icon: <ImageIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />,
    category: 'media',
    action: onUploadImageClick,
  });

  allOptions.push({
    id: 'upload-pdf',
    title: 'Link PDF Document',
    description: 'Upload a PDF and insert an inline document link',
    icon: <FileText className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
    category: 'media',
    action: onUploadPdfClick,
  });

  allOptions.push({
    id: 'insert-link',
    title: 'Insert Web Link',
    description: 'Add a clickable external reference link',
    icon: <LinkIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
    category: 'media',
    action: onInsertLinkClick,
  });

  // Attached files
  if (files && files.length > 0) {
    for (const f of files) {
      allOptions.push({
        id: `file-${f.fileId}`,
        title: f.name,
        description: f.type.startsWith('image/') ? 'Embed attached image' : 'Link attached PDF',
        icon: f.type.startsWith('image/') ? (
          <ImageIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
        ) : (
          <Paperclip className="w-4 h-4 text-amber-500 dark:text-amber-400" />
        ),
        category: 'attached',
        action: () => onInsertFile(f),
      });
    }
  }

  // Attached links
  if (links && links.length > 0) {
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      allOptions.push({
        id: `link-${i}`,
        title: l.label,
        description: l.url,
        icon: <LinkIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
        category: 'attached',
        action: () => onInsertLink(l),
      });
    }
  }

  // Formatting blocks (only when trigger is '/')
  if (trigger === '/') {
    allOptions.push(
      {
        id: 'h1',
        title: 'Heading 1',
        description: 'Large section heading',
        icon: <Heading1 className="w-4 h-4 text-slate-600 dark:text-zinc-300" />,
        category: 'format',
        action: () => onInsertMarkdown('# '),
      },
      {
        id: 'h2',
        title: 'Heading 2',
        description: 'Medium sub-heading',
        icon: <Heading2 className="w-4 h-4 text-slate-600 dark:text-zinc-300" />,
        category: 'format',
        action: () => onInsertMarkdown('## '),
      },
      {
        id: 'h3',
        title: 'Heading 3',
        description: 'Small sub-heading',
        icon: <Heading3 className="w-4 h-4 text-slate-600 dark:text-zinc-300" />,
        category: 'format',
        action: () => onInsertMarkdown('### '),
      },
      {
        id: 'bullet-list',
        title: 'Bullet List',
        description: 'Create a bulleted list',
        icon: <List className="w-4 h-4 text-slate-600 dark:text-zinc-300" />,
        category: 'format',
        action: () => onInsertMarkdown('- '),
      },
      {
        id: 'task-list',
        title: 'To-do List',
        description: 'Track items with checkboxes',
        icon: <CheckSquare className="w-4 h-4 text-slate-600 dark:text-zinc-300" />,
        category: 'format',
        action: () => onInsertMarkdown('- [ ] '),
      },
      {
        id: 'code-block',
        title: 'Code Block',
        description: 'Formatted syntax block',
        icon: <Code className="w-4 h-4 text-slate-600 dark:text-zinc-300" />,
        category: 'format',
        action: () => onInsertMarkdown('```\n', '\n```'),
      },
      {
        id: 'quote',
        title: 'Quote',
        description: 'Capture a blockquote',
        icon: <Quote className="w-4 h-4 text-slate-600 dark:text-zinc-300" />,
        category: 'format',
        action: () => onInsertMarkdown('> '),
      },
      {
        id: 'divider',
        title: 'Divider',
        description: 'Visual horizontal line',
        icon: <Minus className="w-4 h-4 text-slate-600 dark:text-zinc-300" />,
        category: 'format',
        action: () => onInsertMarkdown('\n---\n'),
      }
    );
  }

  // Filter based on search query
  const query = (searchQuery || '').toLowerCase().trim();
  return query
    ? allOptions.filter(
        (o) =>
          o.title.toLowerCase().includes(query) ||
          o.description.toLowerCase().includes(query)
      )
    : allOptions;
}

interface SlashMentionMenuProps {
  open: boolean;
  trigger: '/' | '@';
  searchQuery: string;
  position: { top: number; left: number };
  selectedIndex: number;
  files: TopicFile[];
  links: TopicLink[];
  options?: CommandOption[];
  onHoverOption?: (index: number) => void;
  onSelectOption: (option: CommandOption) => void;
  onUploadImageClick: () => void;
  onUploadPdfClick: () => void;
  onInsertLinkClick: () => void;
  onInsertFile: (file: TopicFile) => void;
  onInsertLink: (link: TopicLink) => void;
  onInsertMarkdown: (prefix: string, suffix?: string) => void;
  onClose: () => void;
}

export function SlashMentionMenu({
  open,
  trigger,
  searchQuery,
  position,
  selectedIndex,
  files,
  links,
  options,
  onHoverOption,
  onSelectOption,
  onUploadImageClick,
  onUploadPdfClick,
  onInsertLinkClick,
  onInsertFile,
  onInsertLink,
  onInsertMarkdown,
}: SlashMentionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  const filtered = options ?? getAvailableSlashCommands({
    trigger,
    searchQuery,
    files,
    links,
    onUploadImageClick,
    onUploadPdfClick,
    onInsertLinkClick,
    onInsertFile,
    onInsertLink,
    onInsertMarkdown,
  });

  // Auto-scroll the menu container when selectedIndex changes via keyboard
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!open) return null;

  if (filtered.length === 0) {
    return (
      <div
        ref={menuRef}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        className="absolute z-50 w-72 p-3 bg-white/95 dark:bg-zinc-950/95 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl backdrop-blur-xl text-xs text-slate-500 dark:text-zinc-500 text-center"
      >
        No matching commands or files
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="absolute z-50 w-80 max-h-72 overflow-y-auto bg-white/95 dark:bg-[#0d0f17]/95 border border-indigo-500/30 rounded-xl shadow-2xl shadow-indigo-950/10 dark:shadow-black/80 backdrop-blur-xl p-1.5 space-y-0.5 text-xs select-none transition-colors"
    >
      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold border-b border-slate-200/80 dark:border-white/5 mb-1 flex items-center justify-between">
        <span>{trigger === '@' ? 'Link & Mention' : 'Commands & Embeds'}</span>
        <span className="text-slate-400 dark:text-zinc-500 font-normal">↑↓ to navigate • ↵ select</span>
      </div>

      {filtered.map((item, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <button
            key={item.id}
            ref={isSelected ? selectedItemRef : undefined}
            type="button"
            onMouseEnter={() => onHoverOption?.(idx)}
            onMouseMove={() => onHoverOption?.(idx)}
            onClick={() => onSelectOption(item)}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
              isSelected
                ? 'bg-indigo-600 text-white font-medium shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white'
            }`}
          >
            <div
              className={`p-1.5 rounded-md shrink-0 ${
                isSelected
                  ? 'bg-white/20'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400'
              }`}
            >
              {item.icon}
            </div>
            <div className="truncate flex-1">
              <p className="truncate text-xs">{item.title}</p>
              <p
                className={`truncate text-[10px] ${
                  isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-zinc-500'
                }`}
              >
                {item.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
