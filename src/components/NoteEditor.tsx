'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { SlashMentionMenu, CommandOption, getAvailableSlashCommands } from '@/components/SlashMentionMenu';
import { ThemeToggle } from './ThemeToggle';
import { Topic, TopicFile, TopicLink, RingColor, RingFrequency, RingSettings, ALLOWED_MIME, MAX_FILE_BYTES } from '@/lib/types';
import { RING_COLORS } from '@/lib/logic';
import { uploadFile, deleteFile } from '@/lib/api';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Minus,
  Link as LinkIcon,
  Upload,
  Eye,
  Columns2,
  Edit3,
  Trash2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Check,
  Calendar,
  Save,
  ArrowLeft,
  PlusCircle,
  AtSign,
  Flame,
} from 'lucide-react';

interface NoteEditorProps {
  initialTopic?: Topic | null;
  isEditing?: boolean;
  onSave: (data: {
    title: string;
    studiedOn: string;
    notes?: string;
    links: TopicLink[];
    files: TopicFile[];
    ring?: RingSettings;
  }) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Calculates (top, left) coordinates for the caret in an HTML textarea
 * so floating suggestion menus align directly next to the cursor.
 */
function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  const div = document.createElement('div');
  const style = window.getComputedStyle(element);

  const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize',
  ];

  div.id = 'input-textarea-caret-position-mirror-div';
  document.body.appendChild(div);

  const styleObj = div.style;
  styleObj.whiteSpace = 'pre-wrap';
  styleObj.wordWrap = 'break-word';
  styleObj.position = 'absolute';
  styleObj.visibility = 'hidden';

  for (const prop of properties) {
    styleObj[prop as any] = style[prop as any];
  }

  div.textContent = element.value.substring(0, position);
  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + parseInt(style.borderTopWidth, 10),
    left: span.offsetLeft + parseInt(style.borderLeftWidth, 10),
  };

  document.body.removeChild(div);
  return coordinates;
}

export function NoteEditor({
  initialTopic,
  isEditing: isEditingProp,
  onSave,
  onCancel,
  onDelete,
}: NoteEditorProps) {
  const isEditing = isEditingProp ?? !!initialTopic;

  const [title, setTitle] = useState(initialTopic?.title || '');
  const [studiedOn, setStudiedOn] = useState(initialTopic?.studiedOn || '');
  const [notes, setNotes] = useState(initialTopic?.notes || '');
  const [links, setLinks] = useState<TopicLink[]>(initialTopic?.links || []);
  const [files, setFiles] = useState<TopicFile[]>(initialTopic?.files || []);

  const [editorMode, setEditorMode] = useState<'split' | 'write' | 'preview'>('split');
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const [ringActive, setRingActive] = useState(Boolean(initialTopic?.ring?.active));
  const [ringFrequency, setRingFrequency] = useState<RingFrequency>(
    initialTopic?.ring?.frequency || '4x-week'
  );
  const [ringColor, setRingColor] = useState<RingColor>(
    (initialTopic?.ring?.color as RingColor) || 'emerald'
  );

  // Slash / Mention Menu State
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuTrigger, setMenuTrigger] = useState<'/' | '@'>('/');
  const [menuSearch, setMenuSearch] = useState('');
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [menuSelectedIndex, setMenuSelectedIndex] = useState(0);
  const [triggerStartIndex, setTriggerStartIndex] = useState<number | null>(null);

  // Link Insertion Dialog State
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [dialogUrl, setDialogUrl] = useState('');
  const [dialogLabel, setDialogLabel] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const savedCursorRef = useRef<number | null>(null);

  useEffect(() => {
    if (!studiedOn && !initialTopic?.studiedOn) {
      setStudiedOn(getTodayString());
    }
  }, [initialTopic?.studiedOn, studiedOn]);

  // Responsive mode on small screens: collapse split to write
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && editorMode === 'split') {
        setEditorMode('write');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [editorMode]);

  const insertTextAtCursor = useCallback((textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setNotes((prev) => prev + '\n' + textToInsert);
      return;
    }

    const start = savedCursorRef.current !== null ? savedCursorRef.current : textarea.selectionStart;
    const end = savedCursorRef.current !== null ? savedCursorRef.current : textarea.selectionEnd;
    savedCursorRef.current = null;

    const newNotes = notes.substring(0, start) + textToInsert + notes.substring(end);
    setNotes(newNotes);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 10);
  }, [notes]);

  const insertMarkdownWrapper = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const targetStart = savedCursorRef.current !== null ? savedCursorRef.current : textarea.selectionStart;
    const targetEnd = savedCursorRef.current !== null ? savedCursorRef.current : textarea.selectionEnd;
    savedCursorRef.current = null;

    let prefix = before;
    if (before.startsWith('- ') || before.startsWith('1. ') || before.startsWith('# ') || before.startsWith('> ')) {
      const textBefore = notes.substring(0, targetStart);
      if (textBefore.length > 0 && !textBefore.endsWith('\n')) {
        prefix = '\n' + before;
      }
    }

    const selectedText = notes.substring(targetStart, targetEnd);
    const replacement = `${prefix}${selectedText || ''}${after}`;

    const newNotes = notes.substring(0, targetStart) + replacement + notes.substring(targetEnd);
    setNotes(newNotes);

    setTimeout(() => {
      textarea.focus();
      const newCursor = targetStart + prefix.length + (selectedText.length || 0);
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  }, [notes]);

  // Handle inserting an existing uploaded file or link
  const handleInsertExistingFile = useCallback((file: TopicFile) => {
    if (file.type.startsWith('image/')) {
      insertTextAtCursor(`\n\n![${file.name}](/api/files/${file.fileId})\n\n`);
    } else {
      insertTextAtCursor(`\n\n[📄 ${file.name}](/api/files/${file.fileId})\n\n`);
    }
  }, [insertTextAtCursor]);

  const handleInsertExistingLink = useCallback((link: TopicLink) => {
    insertTextAtCursor(` [${link.label}](${link.url}) `);
  }, [insertTextAtCursor]);

  // Compute available slash/mention commands based on current query and attachments
  const commandOptions = useMemo(() => {
    return getAvailableSlashCommands({
      trigger: menuTrigger,
      searchQuery: menuSearch,
      files,
      links,
      onUploadImageClick: () => imageInputRef.current?.click(),
      onUploadPdfClick: () => pdfInputRef.current?.click(),
      onInsertLinkClick: () => {
        setDialogUrl('');
        setDialogLabel('');
        setLinkDialogOpen(true);
      },
      onInsertFile: (file) => handleInsertExistingFile(file),
      onInsertLink: (link) => handleInsertExistingLink(link),
      onInsertMarkdown: (prefix, suffix) => insertMarkdownWrapper(prefix, suffix),
    });
  }, [menuTrigger, menuSearch, files, links, handleInsertExistingFile, handleInsertExistingLink, insertMarkdownWrapper]);

  // Erase the typed trigger (/query or @query) and execute command
  const executeWithTriggerReplaced = useCallback((action: () => void) => {
    const textarea = textareaRef.current;
    if (!textarea || triggerStartIndex === null) {
      action();
      setMenuOpen(false);
      return;
    }

    const cursorPos = textarea.selectionStart;
    const beforeTrigger = notes.substring(0, triggerStartIndex);
    const afterCursor = notes.substring(cursorPos);
    setNotes(beforeTrigger + afterCursor);
    savedCursorRef.current = triggerStartIndex;

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(triggerStartIndex, triggerStartIndex);
      action();
      setMenuOpen(false);
    }, 10);
  }, [notes, triggerStartIndex]);

  // Detect when user types / or @
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);

    // Look for slash / or mention @ at current word
    const match = /(?:^|\s)([/@])([^\s]*)$/.exec(textBeforeCursor);

    if (match) {
      const triggerChar = match[1] as '/' | '@';
      const query = match[2];
      const startIndex = cursorPos - query.length - 1;

      try {
        const coords = getCaretCoordinates(e.target, cursorPos);
        const topOffset = coords.top - e.target.scrollTop + 32;
        const leftOffset = Math.min(coords.left, (editorContainerRef.current?.clientWidth || 600) - 340);

        setMenuPosition({
          top: Math.max(10, topOffset),
          left: Math.max(10, leftOffset),
        });
        setMenuTrigger(triggerChar);
        setMenuSearch(query);
        setTriggerStartIndex(startIndex);
        setMenuSelectedIndex(0);
        setMenuOpen(true);
      } catch {
        // Fallback
      }
    } else {
      setMenuOpen(false);
    }
  };

  // Keyboard navigation for / and @ dropdown, and automatic list / task-list continuation on Enter
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (menuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (commandOptions.length > 0) {
          setMenuSelectedIndex((prev) => (prev + 1) % commandOptions.length);
        }
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandOptions.length > 0) {
          setMenuSelectedIndex((prev) => (prev - 1 + commandOptions.length) % commandOptions.length);
        }
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (commandOptions.length > 0) {
          const selected = commandOptions[menuSelectedIndex] || commandOptions[0];
          if (selected) {
            executeWithTriggerReplaced(selected.action);
          }
        } else {
          setMenuOpen(false);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false);
        return;
      }
    }

    // When dropdown is not open, handle smart Enter for lists and checkboxes
    if (!menuOpen && e.key === 'Enter' && !e.shiftKey) {
      const textarea = textareaRef.current;
      if (textarea) {
        const cursorPos = textarea.selectionStart;
        const textBefore = notes.substring(0, cursorPos);
        const lastLine = textBefore.split('\n').pop() || '';

        // Empty task item: "- [ ] " or "- [x] " -> exit task list
        if (/^[-*]\s*\[[ xX]\]\s*$/.test(lastLine)) {
          e.preventDefault();
          const lineStart = cursorPos - lastLine.length;
          const newNotes = notes.substring(0, lineStart) + notes.substring(cursorPos);
          setNotes(newNotes);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 10);
          return;
        }

        // Active task item: continue to next task "- [ ] "
        if (/^[-*]\s*\[[ xX]\]\s+.+/.test(lastLine)) {
          e.preventDefault();
          const insert = '\n- [ ] ';
          const afterCursor = notes.substring(cursorPos);
          const newNotes = textBefore + insert + afterCursor;
          setNotes(newNotes);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(cursorPos + insert.length, cursorPos + insert.length);
          }, 10);
          return;
        }

        // Empty bullet item: "- " -> exit bullet list
        if (/^[-*]\s*$/.test(lastLine)) {
          e.preventDefault();
          const lineStart = cursorPos - lastLine.length;
          const newNotes = notes.substring(0, lineStart) + notes.substring(cursorPos);
          setNotes(newNotes);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 10);
          return;
        }

        // Active bullet item: continue to next bullet "- "
        if (/^[-*]\s+.+/.test(lastLine)) {
          e.preventDefault();
          const insert = '\n- ';
          const afterCursor = notes.substring(cursorPos);
          const newNotes = textBefore + insert + afterCursor;
          setNotes(newNotes);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(cursorPos + insert.length, cursorPos + insert.length);
          }, 10);
          return;
        }
      }
    }
  };

  const handleAddLink = (insertIntoNotes: boolean = false) => {
    if (!newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      const parsed = new URL(url);
      const label = newLabel.trim() || parsed.hostname;
      const newLink = { url, label };
      setLinks((prev) => [...prev, newLink]);

      if (insertIntoNotes) {
        insertTextAtCursor(` [${label}](${url}) `);
      }

      setNewUrl('');
      setNewLabel('');
      setError(null);
    } catch {
      setError('Please enter a valid URL');
    }
  };

  const handleInsertDialogLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dialogUrl.trim()) return;

    let url = dialogUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setError('URL must begin with http:// or https://');
        return;
      }
      let label = dialogLabel.trim() || parsed.hostname;
      insertTextAtCursor(` [${label}](${url}) `);
      setLinks((prev) => [...prev, { url, label }]);
      setDialogUrl('');
      setDialogLabel('');
      setLinkDialogOpen(false);
      setError(null);
    } catch {
      setError(`"${dialogUrl}" is not a valid web URL. Please enter a valid link address.`);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    autoInsert: boolean = false
  ) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      const uploadedList: TopicFile[] = [];
      for (let i = 0; i < selected.length; i++) {
        const file = selected[i];
        if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
          throw new Error(`Disallowed file "${file.name}". Only PDFs and images allowed.`);
        }
        if (file.size > MAX_FILE_BYTES) {
          throw new Error(`File "${file.name}" exceeds 20MB.`);
        }
        const uploaded = await uploadFile(file);
        uploadedList.push(uploaded);
      }

      setFiles((prev) => [...prev, ...uploadedList]);

      if (autoInsert) {
        let markdownSnippet = '';
        for (const f of uploadedList) {
          if (f.type.startsWith('image/')) {
            markdownSnippet += `\n\n![${f.name}](/api/files/${f.fileId})\n\n`;
          } else {
            markdownSnippet += `\n\n[📄 ${f.name}](/api/files/${f.fileId})\n\n`;
          }
        }
        insertTextAtCursor(markdownSnippet);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.fileId !== fileId));
    try {
      await deleteFile(fileId);
    } catch {
      // background cleanup
    }
  };

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setError('Please provide a topic title');
      return;
    }
    setError(null);
    setSaving(true);

    try {
      // Filter out any broken or malformed URLs before sending to the server
      const validLinks = links.filter((l) => {
        try {
          const u = new URL(l.url);
          return (u.protocol === 'http:' || u.protocol === 'https:') && !l.url.includes(' ');
        } catch {
          return false;
        }
      });

      await onSave({
        title: title.trim(),
        studiedOn,
        notes: notes.trim() ? notes : undefined,
        links: validLinks,
        files,
        ring: ringActive
          ? {
              active: true,
              frequency: ringFrequency,
              color: ringColor,
              lastStudiedAt: initialTopic?.ring?.lastStudiedAt || studiedOn,
              sessionsCount: initialTopic?.ring?.sessionsCount || 0,
              history: initialTopic?.ring?.history || (studiedOn ? [studiedOn] : []),
            }
          : { active: false, frequency: 'daily' },
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [title, studiedOn, notes, links, files, ringActive, ringFrequency, ringColor, initialTopic, onSave]);

  // Global keyboard shortcuts: Cmd+S / Ctrl+S or Cmd+Enter / Ctrl+Enter to save anywhere
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleSave]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090a10] text-slate-900 dark:text-[#f8fafc] transition-colors">
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => handleFileUpload(e, true)}
        className="hidden"
      />
      <input
        ref={pdfInputRef}
        type="file"
        multiple
        accept="application/pdf"
        onChange={(e) => handleFileUpload(e, true)}
        className="hidden"
      />

      {/* Top sticky editor bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#090a10]/90 backdrop-blur-xl px-4 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="gap-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>

            <span className="text-slate-300 dark:text-zinc-600">/</span>

            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
              {isEditing ? 'Editing Task' : 'Create New Topic'}
            </span>

            {savedNotice && (
              <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1 py-0">
                <Check className="w-3 h-3" /> Saved
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* View Mode switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-900/80 border border-slate-200 dark:border-white/10 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setEditorMode('write')}
                className={`px-2 sm:px-2.5 py-1 rounded-md transition-all ${
                  editorMode === 'write'
                    ? 'bg-indigo-600 text-white font-medium shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Write</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('split')}
                className={`hidden md:inline-flex px-2.5 py-1 rounded-md transition-all ${
                  editorMode === 'split'
                    ? 'bg-indigo-600 text-white font-medium shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Columns2 className="w-3.5 h-3.5" /> Split
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('preview')}
                className={`px-2 sm:px-2.5 py-1 rounded-md transition-all ${
                  editorMode === 'preview'
                    ? 'bg-indigo-600 text-white font-medium shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </span>
              </button>
            </div>

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 px-2.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-red-500/10 text-xs"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || uploading || !title.trim()}
              className="h-8 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium shadow-md shadow-indigo-600/30 gap-1.5 text-xs"
              title="Save changes (Enter in title, or Ctrl+Enter anywhere)"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Topic'}
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-4">
          <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        {/* Title & Date Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (title.trim() && !saving) {
                  handleSave();
                }
              }
            }}
            placeholder="Topic title (e.g. Distributed Consensus in Raft, Gym Workout, React Hooks...)"
            className="text-2xl sm:text-3xl font-bold bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-0 w-full"
            autoFocus
          />

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                Date:
              </span>
              <input
                type="date"
                value={studiedOn}
                onChange={(e) => setStudiedOn(e.target.value)}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Habit Ring Cadence & Color Toggle */}
            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs">
              <button
                type="button"
                onClick={() => setRingActive(!ringActive)}
                className={`flex items-center gap-1.5 font-medium transition-colors ${
                  ringActive ? 'text-amber-500 dark:text-amber-400' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300'
                }`}
                title="Toggle Habit Ring (Track weekly or monthly goal)"
              >
                <Flame className={`w-3.5 h-3.5 ${ringActive ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                <span>Habit Ring</span>
              </button>

              {ringActive && (
                <>
                  <select
                    value={ringFrequency}
                    onChange={(e) => setRingFrequency(e.target.value as RingFrequency)}
                    className="bg-slate-50 dark:bg-zinc-950 text-amber-600 dark:text-amber-300 border border-slate-200 dark:border-white/10 rounded px-1.5 py-0.5 text-[11px] focus:outline-none cursor-pointer"
                  >
                    <option value="4x-week">At least 4 days / week (e.g. Gym)</option>
                    <option value="daily">Daily (7 days / week)</option>
                    <option value="3x-week">At least 3 days / week</option>
                    <option value="2x-week">At least 2 days / week</option>
                    <option value="1x-week">At least 1 day / week</option>
                    <option value="biweekly">Every 2 weeks</option>
                    <option value="monthly">Monthly</option>
                  </select>

                  <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-white/10">
                    {(Object.keys(RING_COLORS) as RingColor[]).map((cKey) => {
                      const cDef = RING_COLORS[cKey];
                      const isSel = ringColor === cKey;
                      return (
                        <button
                          key={cKey}
                          type="button"
                          onClick={() => setRingColor(cKey)}
                          className={`w-4 h-4 rounded-full transition-all ${
                            isSel ? 'ring-2 ring-indigo-500 dark:ring-white scale-125' : 'opacity-60 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: cDef.hex }}
                          title={cDef.name}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Markdown Toolbar - Smooth horizontal touch scroll on mobile */}
        <div className="flex items-center gap-1 p-1.5 bg-white/80 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-white/10 rounded-xl text-slate-700 dark:text-zinc-300 overflow-x-auto touch-pan-x scrollbar-none transition-colors">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdownWrapper('**', '**')}
            className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-white/10"
            title="Bold (**text**)"
          >
            <Bold className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdownWrapper('*', '*')}
            className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-white/10"
            title="Italic (*text*)"
          >
            <Italic className="w-3.5 h-3.5" />
          </Button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdownWrapper('# ')}
            className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-white/10"
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdownWrapper('## ')}
            className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-white/10"
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdownWrapper('### ')}
            className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-white/10"
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </Button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdownWrapper('- ')}
            className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-white/10"
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdownWrapper('1. ')}
            className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-white/10"
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdownWrapper('- [ ] ')}
            className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-white/10"
            title="Task List"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </Button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdownWrapper('```\n', '\n```')}
            className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-white/10"
            title="Code Block"
          >
            <Code className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdownWrapper('> ')}
            className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-white/10"
            title="Quote"
          >
            <Quote className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdownWrapper('\n---\n')}
            className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-white/10"
            title="Horizontal Divider"
          >
            <Minus className="w-3.5 h-3.5" />
          </Button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-1" />

          {/* Inline Link Inserter */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDialogUrl('');
              setDialogLabel('');
              setLinkDialogOpen(true);
            }}
            className="h-7 px-2 text-xs hover:bg-slate-100 dark:hover:bg-white/10 gap-1 text-indigo-600 dark:text-indigo-300"
            title="Insert Link [title](url)"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Link</span>
          </Button>

          {/* Inline Image Inserter */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading}
            className="h-7 px-2 text-xs hover:bg-slate-100 dark:hover:bg-white/10 gap-1 text-indigo-600 dark:text-indigo-300"
            title="Upload and embed image inline"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Image</span>
          </Button>

          {/* Inline PDF Inserter */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => pdfInputRef.current?.click()}
            disabled={uploading}
            className="h-7 px-2 text-xs hover:bg-slate-100 dark:hover:bg-white/10 gap-1 text-amber-600 dark:text-amber-300"
            title="Upload and link PDF inline"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">PDF</span>
          </Button>

          <div className="ml-auto hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-500 pr-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">/</span> or{' '}
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">@</span>
            <span>for command menu</span>
          </div>
        </div>

        {/* Content Workspace with Caret Command Menu */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[460px]">
          {/* Write pane with relative positioning for floating / and @ menu */}
          {(editorMode === 'write' || editorMode === 'split') && (
            <div
              ref={editorContainerRef}
              className={`relative flex flex-col rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-950/60 backdrop-blur-md overflow-hidden transition-colors ${
                editorMode === 'write' ? 'lg:col-span-2' : ''
              }`}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] text-[11px] text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>Type / or @ to link images, PDFs, links &amp; format blocks</span>
                </span>
                <span>{notes.length.toLocaleString()} / 50,000 chars</span>
              </div>

              <textarea
                ref={textareaRef}
                value={notes}
                onChange={handleTextareaChange}
                onKeyDown={handleTextareaKeyDown}
                placeholder="# Concept Overview&#10;&#10;Type / to insert headings, code blocks, or upload images & PDFs!&#10;Type @ to quickly link any file or reference URL inline.&#10;&#10;Try typing / or @ right here!"
                className="flex-1 w-full p-4 bg-transparent resize-none border-none text-sm text-slate-900 dark:text-zinc-100 font-mono leading-relaxed placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-0 min-h-[420px]"
                maxLength={50000}
              />

              {/* Floating Slash / Mention Dropdown Menu */}
              <SlashMentionMenu
                open={menuOpen}
                trigger={menuTrigger}
                searchQuery={menuSearch}
                position={menuPosition}
                selectedIndex={menuSelectedIndex}
                files={files}
                links={links}
                options={commandOptions}
                onHoverOption={(idx) => setMenuSelectedIndex(idx)}
                onSelectOption={(option: CommandOption) => {
                  executeWithTriggerReplaced(option.action);
                }}
                onUploadImageClick={() => {
                  executeWithTriggerReplaced(() => imageInputRef.current?.click());
                }}
                onUploadPdfClick={() => {
                  executeWithTriggerReplaced(() => pdfInputRef.current?.click());
                }}
                onInsertLinkClick={() => {
                  executeWithTriggerReplaced(() => {
                    setDialogUrl('');
                    setDialogLabel('');
                    setLinkDialogOpen(true);
                  });
                }}
                onInsertFile={(file: TopicFile) => {
                  executeWithTriggerReplaced(() => handleInsertExistingFile(file));
                }}
                onInsertLink={(link: TopicLink) => {
                  executeWithTriggerReplaced(() => handleInsertExistingLink(link));
                }}
                onInsertMarkdown={(prefix: string, suffix?: string) => {
                  executeWithTriggerReplaced(() => insertMarkdownWrapper(prefix, suffix));
                }}
                onClose={() => setMenuOpen(false)}
              />
            </div>
          )}

          {/* Preview pane */}
          {(editorMode === 'preview' || editorMode === 'split') && (
            <div
              className={`flex flex-col rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-950/80 backdrop-blur-md overflow-hidden transition-colors ${
                editorMode === 'preview' ? 'lg:col-span-2' : ''
              }`}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] text-[11px] text-slate-500 dark:text-zinc-400">
                <span>Formatted Preview (Live)</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px]">Inline Images &amp; PDFs Render Live</span>
              </div>
              <div className="flex-1 p-6 overflow-y-auto max-h-[600px] text-slate-800 dark:text-zinc-200">
                {notes.trim() ? (
                  <MarkdownRenderer content={notes} />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 dark:text-zinc-600 text-xs italic py-16">
                    Formatted notes with inline diagrams and links will preview here in real time...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* References & Attachments Management Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Links & References */}
          <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-950/60 p-4 space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                References &amp; Links ({links.length})
              </h4>
            </div>

            {links.length > 0 && (
              <div className="space-y-2">
                {links.map((link, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 text-xs group"
                  >
                    <div className="truncate flex items-center gap-2 max-w-[65%]">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />
                      <span className="font-medium text-slate-800 dark:text-zinc-200 truncate">{link.label}:</span>
                      <span className="text-slate-500 dark:text-zinc-500 truncate">{link.url}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleInsertExistingLink(link)}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 transition-colors flex items-center gap-1"
                        title="Insert link into note text at cursor"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>In text</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLinks((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors p-1"
                        title="Remove link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Input
                placeholder="https://..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLink(false);
                  }
                }}
                className="text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
              />
              <Input
                placeholder="Label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLink(false);
                  }
                }}
                className="text-xs sm:max-w-[140px] bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddLink(false)}
                disabled={!newUrl.trim()}
                className="text-xs border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200 shrink-0"
              >
                Add Link (↵)
              </Button>
            </div>
          </div>

          {/* Files & Attachments */}
          <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-950/60 p-4 space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                Attachments ({files.length})
              </h4>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => handleFileUpload(e, false)}
                  className="hidden"
                  disabled={uploading || saving}
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? 'Uploading...' : 'Upload Files'}
                </span>
              </label>
            </div>

            {files.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {files.map((file) => (
                  <div
                    key={file.fileId}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[55%]">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <div className="truncate">
                        <p className="font-medium text-slate-800 dark:text-zinc-200 truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-500">{formatBytes(file.size)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleInsertExistingFile(file)}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 transition-colors flex items-center gap-1"
                        title="Insert image or PDF card into notes at cursor"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>In text</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.fileId)}
                        className="text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-zinc-600 italic py-2">
                Type <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">/</span> or <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">@</span> to upload and embed files directly in text.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Insert Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-[420px] bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white font-bold">Insert Web Link</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-zinc-400 text-xs">
              Enter the URL and optional label to embed at cursor position. Press Enter to insert.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInsertDialogLink} className="space-y-4 pt-1">
            <div className="space-y-3 py-1">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">URL *</label>
                <Input
                  placeholder="https://example.com/guide"
                  value={dialogUrl}
                  onChange={(e) => setDialogUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInsertDialogLink();
                    }
                  }}
                  className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Label (optional)</label>
                <Input
                  placeholder="Documentation"
                  value={dialogLabel}
                  onChange={(e) => setDialogLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInsertDialogLink();
                    }
                  }}
                  className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLinkDialogOpen(false)}
                className="text-xs border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!dialogUrl.trim()}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                Insert Link (↵)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
