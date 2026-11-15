'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  createTopic,
  updateTopic,
  uploadFile,
  deleteFile,
  ApiError,
} from '@/lib/api';
import { Topic, TopicFile, TopicLink, RingFrequency, ALLOWED_MIME, MAX_FILE_BYTES } from '@/lib/types';
import { Plus, Trash2, Upload, FileText, Image as ImageIcon, Eye, Edit3, Flame } from 'lucide-react';

interface TopicFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicToEdit?: Topic | null;
  onSuccess: (savedTopic: Topic) => void;
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

export function TopicForm({
  open,
  onOpenChange,
  topicToEdit,
  onSuccess,
}: TopicFormProps) {
  const isEditing = !!topicToEdit;

  const [title, setTitle] = useState('');
  const [studiedOn, setStudiedOn] = useState('');
  const [notes, setNotes] = useState('');
  const [previewNotes, setPreviewNotes] = useState(false);

  const [links, setLinks] = useState<TopicLink[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const [files, setFiles] = useState<TopicFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ringActive, setRingActive] = useState(false);
  const [ringFrequency, setRingFrequency] = useState<RingFrequency>('daily');

  useEffect(() => {
    if (topicToEdit) {
      setTitle(topicToEdit.title);
      setStudiedOn(topicToEdit.studiedOn);
      setNotes(topicToEdit.notes || '');
      setLinks(topicToEdit.links || []);
      setFiles(topicToEdit.files || []);
      setRingActive(!!topicToEdit.ring?.active);
      setRingFrequency(topicToEdit.ring?.frequency || 'daily');
    } else {
      setTitle('');
      setStudiedOn(getTodayString());
      setNotes('');
      setLinks([]);
      setFiles([]);
      setRingActive(false);
      setRingFrequency('daily');
    }
    setPreviewNotes(false);
    setError(null);
  }, [topicToEdit, open]);

  const handleAddLink = () => {
    if (!newUrl.trim()) return;

    const validUrl = newUrl.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      setError('Links must begin with http:// or https://');
      return;
    }

    try {
      const parsed = new URL(validUrl);
      const label = newLabel.trim() || parsed.hostname;
      setLinks([...links, { url: validUrl, label }]);
      setNewUrl('');
      setNewLabel('');
      setError(null);
    } catch {
      setError('Please enter a valid URL');
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      const newFilesList: TopicFile[] = [...files];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
          throw new Error(`Disallowed file: "${file.name}". Only PDFs and images are allowed.`);
        }

        if (file.size > MAX_FILE_BYTES) {
          throw new Error(`File "${file.name}" exceeds the 20MB size limit.`);
        }

        const uploaded = await uploadFile(file);
        newFilesList.push(uploaded);
      }

      setFiles(newFilesList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    // Remove from UI list
    setFiles(files.filter((f) => f.fileId !== fileId));
    // Clean up from GridFS
    try {
      await deleteFile(fileId);
    } catch {
      // Ignore background cleanup errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !studiedOn) return;

    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        studiedOn,
        notes: notes.trim() ? notes : undefined,
        links,
        files,
        ring: ringActive
          ? {
              active: true,
              frequency: ringFrequency,
              lastStudiedAt: topicToEdit?.ring?.lastStudiedAt || studiedOn,
              sessionsCount: topicToEdit?.ring?.sessionsCount || 0,
            }
          : { active: false, frequency: 'daily' as RingFrequency },
      };

      let result: Topic;
      if (isEditing && topicToEdit) {
        result = await updateTopic(topicToEdit._id, payload);
      } else {
        result = await createTopic(payload);
      }

      onSuccess(result);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save topic');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Topic' : 'Add New Topic'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the topic details, notes, links, or attachments.'
              : 'Log a new study topic with descriptive notes, references, and files.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          {/* Title & Studied On */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label htmlFor="topic-title" className="text-sm font-medium">
                Topic Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="topic-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Distributed Consensus in Raft"
                required
                maxLength={200}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="topic-date" className="text-sm font-medium">
                Studied On <span className="text-destructive">*</span>
              </label>
              <Input
                id="topic-date"
                type="date"
                value={studiedOn}
                onChange={(e) => setStudiedOn(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          {/* Study Ring Toggle */}
          <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <label
                  htmlFor="ring-toggle"
                  className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Include in Study Ring (Active Study)</span>
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Keep this topic active on your radar with regular study reminders.
                </p>
              </div>
              <input
                id="ring-toggle"
                type="checkbox"
                checked={ringActive}
                onChange={(e) => setRingActive(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {ringActive && (
              <div className="pt-2 border-t border-amber-500/10 flex items-center justify-between gap-4">
                <span className="text-xs text-zinc-300 font-medium">Cadence:</span>
                <select
                  value={ringFrequency}
                  onChange={(e) => setRingFrequency(e.target.value as RingFrequency)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-white/10 bg-zinc-900 text-zinc-200"
                >
                  <option value="daily">Daily Focus (Every day)</option>
                  <option value="every-2-days">Every 2 Days (Alternating)</option>
                  <option value="3x-week">3× per Week</option>
                  <option value="weekly">Weekly Cadence</option>
                </select>
              </div>
            )}
          </div>

          {/* Notes (Markdown) with Write / Preview toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="topic-notes" className="text-sm font-medium">
                Notes (Markdown)
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setPreviewNotes(!previewNotes)}
              >
                {previewNotes ? (
                  <>
                    <Edit3 className="w-3.5 h-3.5" /> Write
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </>
                )}
              </Button>
            </div>

            {previewNotes ? (
              <div className="min-h-[160px] max-h-[300px] overflow-y-auto p-3 border rounded-md bg-muted/20 text-sm">
                {notes.trim() ? (
                  <div className="prose prose-neutral dark:prose-invert max-w-none text-sm">
                    <ReactMarkdown>{notes}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-xs">Nothing to preview</p>
                )}
              </div>
            ) : (
              <Textarea
                id="topic-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write markdown notes, summaries, key takeaways..."
                rows={6}
                maxLength={50000}
                disabled={submitting}
                className="font-mono text-sm"
              />
            )}
          </div>

          {/* References & Links Section */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              References & Links
            </h4>

            {links.length > 0 && (
              <div className="space-y-2">
                {links.map((link, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/40 border text-xs"
                  >
                    <div className="truncate max-w-[400px]">
                      <span className="font-medium mr-2">{link.label}:</span>
                      <span className="text-muted-foreground">{link.url}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveLink(idx)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="https://example.com/paper.pdf"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="text-xs"
                disabled={submitting}
              />
              <Input
                placeholder="Label (optional)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="text-xs sm:max-w-[180px]"
                disabled={submitting}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLink}
                disabled={!newUrl.trim() || submitting}
                className="gap-1 text-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Attachments (PDFs & Images, max 20MB)
              </h4>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading || submitting}
                />
                <span
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'cursor-pointer gap-1 text-xs',
                    (uploading || submitting) && 'opacity-50 pointer-events-none'
                  )}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? 'Uploading...' : 'Upload Files'}
                </span>
              </label>
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {files.map((file) => (
                  <div
                    key={file.fileId}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/40 border text-xs"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[200px]">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <div className="truncate">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveFile(file.fileId)}
                      disabled={uploading || submitting}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting || uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || uploading || !title.trim() || !studiedOn}
            >
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Topic'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
