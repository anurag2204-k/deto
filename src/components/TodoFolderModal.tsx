'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TodoFolder } from '@/lib/types';
import { Folder, FolderPlus } from 'lucide-react';

interface TodoFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: TodoFolder | null; // If editing existing folder
  initialParentId?: string | null; // If adding subfolder under a specific parent
  availableFolders: TodoFolder[];
  onSave: (data: { name: string; parentId: string | null; color: string }) => Promise<void>;
}

const FOLDER_COLORS = [
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-500', border: 'border-indigo-400' },
  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-500', border: 'border-emerald-400' },
  { id: 'amber', name: 'Amber', bg: 'bg-amber-500', border: 'border-amber-400' },
  { id: 'rose', name: 'Rose', bg: 'bg-rose-500', border: 'border-rose-400' },
  { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-500', border: 'border-cyan-400' },
  { id: 'violet', name: 'Violet', bg: 'bg-violet-500', border: 'border-violet-400' },
  { id: 'slate', name: 'Slate', bg: 'bg-slate-500', border: 'border-slate-400' },
];

export function TodoFolderModal({
  open,
  onOpenChange,
  folder,
  initialParentId,
  availableFolders,
  onSave,
}: TodoFolderModalProps) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [color, setColor] = useState('indigo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (folder) {
        setName(folder.name);
        setParentId(folder.parentId);
        setColor(folder.color || 'indigo');
      } else {
        setName('');
        setParentId(initialParentId ?? null);
        setColor('indigo');
      }
      setError(null);
    }
  }, [open, folder, initialParentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please provide a folder name');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({ name: trimmed, parentId, color });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save folder');
    } finally {
      setSaving(false);
    }
  };

  // Prevent selecting self as parent if editing
  const eligibleParents = availableFolders.filter(
    (f) => !folder || (f._id !== folder._id && f.parentId !== folder._id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] sm:max-w-md bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl shadow-2xl p-5 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              {folder ? <Folder className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {folder ? 'Edit Folder' : initialParentId ? 'New Subfolder' : 'New Folder'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                {initialParentId
                  ? 'Organize related to-dos inside this subfolder.'
                  : 'Create a top-level category or folder for your to-dos.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 text-xs text-red-600 dark:text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}

          {/* Folder Name */}
          <div className="space-y-1.5">
            <label htmlFor="folder-name" className="text-xs font-medium text-slate-700 dark:text-zinc-300">
              Folder Name
            </label>
            <Input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Action, Work, Personal, Side Projects..."
              required
              disabled={saving}
              className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:border-indigo-500"
              autoFocus
            />
          </div>

          {/* Parent Folder (for subfolder creation) */}
          <div className="space-y-1.5">
            <label htmlFor="parent-folder" className="text-xs font-medium text-slate-700 dark:text-zinc-300">
              Parent Folder (Optional)
            </label>
            <select
              id="parent-folder"
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value ? e.target.value : null)}
              disabled={saving}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
            >
              <option value="">None (Top-level folder)</option>
              {eligibleParents.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.parentId ? '↳ ' : '📁 '}
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Color Tag */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 block">
              Color Accent
            </span>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {FOLDER_COLORS.map((c) => {
                const isSelected = color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center transition-all ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-[#0f111a] scale-110 shadow-sm'
                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                    title={c.name}
                  />
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-200/80 dark:border-white/5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="text-xs border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !name.trim()}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/30"
            >
              {saving ? 'Saving...' : folder ? 'Save Changes' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
