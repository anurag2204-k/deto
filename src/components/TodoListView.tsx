'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TodoFolder, TodoItem } from '@/lib/types';
import { TodoFolderModal } from '@/components/TodoFolderModal';
import {
  Folder,
  FolderPlus,
  Plus,
  Check,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  ListTodo,
  Search,
  CheckCircle2,
  Circle,
  Inbox,
  Layers,
  Sparkles,
  MoreVertical,
  CornerDownRight,
  Filter,
} from 'lucide-react';

interface TodoListViewProps {
  folders: TodoFolder[];
  items: TodoItem[];
  isOwner: boolean;
  onCreateFolder: (data: { name: string; parentId: string | null; color: string }) => Promise<void>;
  onUpdateFolder: (id: string, data: { name?: string; parentId?: string | null; color?: string }) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  onCreateItem: (data: { text: string; folderId: string | null; notes?: string }) => Promise<void>;
  onUpdateItem: (id: string, data: Partial<{ text: string; done: boolean; folderId: string | null; notes?: string; subtasks?: Array<{ id: string; text: string; done: boolean }> }>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

const COLOR_CLASSES: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  indigo: { dot: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  emerald: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  amber: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  rose: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  cyan: { dot: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  violet: { dot: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  slate: { dot: 'bg-slate-500', text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
};

export function TodoListView({
  folders,
  items,
  isOwner,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
}: TodoListViewProps) {
  // Navigation / Filter State
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all'); // 'all' | 'inbox' | folderId
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());

  // Input states
  const [newTodoText, setNewTodoText] = useState('');
  const [addingTodo, setAddingTodo] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');

  // Folder Modal state
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<TodoFolder | null>(null);
  const [subfolderParentId, setSubfolderParentId] = useState<string | null>(null);

  // Subtasks toggle per item
  const [expandedSubtaskItemIds, setExpandedSubtaskItemIds] = useState<Set<string>>(new Set());
  const [newSubtaskText, setNewSubtaskText] = useState<Record<string, string>>({});

  // Build folder lookup & hierarchy tree
  const folderMap = useMemo(() => new Map(folders.map((f) => [f._id, f])), [folders]);

  const { rootFolders, subfoldersByParent } = useMemo(() => {
    const roots: TodoFolder[] = [];
    const subMap: Record<string, TodoFolder[]> = {};

    for (const f of folders) {
      if (!f.parentId) {
        roots.push(f);
      } else {
        if (!subMap[f.parentId]) subMap[f.parentId] = [];
        subMap[f.parentId].push(f);
      }
    }

    return { rootFolders: roots, subfoldersByParent: subMap };
  }, [folders]);

  // Counts of uncompleted items per folder
  const activeCountsByFolder = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      if (!item.done) {
        const key = item.folderId || 'inbox';
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return counts;
  }, [items]);

  const toggleFolderExpanded = (fId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(fId)) {
        next.delete(fId);
      } else {
        next.add(fId);
      }
      return next;
    });
  };

  // Determine current active folder details
  const activeFolder = selectedFolderId !== 'all' && selectedFolderId !== 'inbox'
    ? folderMap.get(selectedFolderId) || null
    : null;

  // Breadcrumbs for active folder
  const breadcrumbs = useMemo(() => {
    if (!activeFolder) return [];
    const trail: TodoFolder[] = [activeFolder];
    let curr = activeFolder;
    while (curr.parentId && folderMap.has(curr.parentId)) {
      curr = folderMap.get(curr.parentId)!;
      trail.unshift(curr);
    }
    return trail;
  }, [activeFolder, folderMap]);

  // Filter items according to folder, status, and search query
  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Folder match
      if (selectedFolderId === 'inbox') {
        if (item.folderId !== null && item.folderId !== '') return false;
      } else if (selectedFolderId !== 'all') {
        // Match specific folder or its descendant subfolders
        const validFolderIds = new Set<string>([selectedFolderId]);
        const addChildren = (pId: string) => {
          const subs = subfoldersByParent[pId] || [];
          for (const s of subs) {
            validFolderIds.add(s._id);
            addChildren(s._id);
          }
        };
        addChildren(selectedFolderId);

        if (!item.folderId || !validFolderIds.has(item.folderId)) return false;
      }

      // 2. Filter mode (all/active/completed)
      if (filterMode === 'active' && item.done) return false;
      if (filterMode === 'completed' && !item.done) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = item.text.toLowerCase().includes(q);
        const notesMatch = item.notes?.toLowerCase().includes(q);
        const subtasksMatch = item.subtasks?.some((s) => s.text.toLowerCase().includes(q));
        if (!textMatch && !notesMatch && !subtasksMatch) return false;
      }

      return true;
    });
  }, [items, selectedFolderId, filterMode, searchQuery, subfoldersByParent]);

  // Handle Quick Add To-Do
  const handleAddTodo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newTodoText.trim();
    if (!text || addingTodo) return;

    setAddingTodo(true);
    try {
      const targetFolderId =
        selectedFolderId === 'all' || selectedFolderId === 'inbox'
          ? null
          : selectedFolderId;

      await onCreateItem({
        text,
        folderId: targetFolderId,
      });
      setNewTodoText('');
    } finally {
      setAddingTodo(false);
    }
  };

  // Inline Edit Item
  const handleStartEditItem = (item: TodoItem) => {
    setEditingItemId(item._id);
    setEditingItemText(item.text);
  };

  const handleSaveItemEdit = async (itemId: string) => {
    const text = editingItemText.trim();
    if (!text) {
      setEditingItemId(null);
      return;
    }
    await onUpdateItem(itemId, { text });
    setEditingItemId(null);
  };

  // Toggle Subtask inside an item
  const handleToggleSubtask = async (item: TodoItem, subtaskId: string, done: boolean) => {
    const updatedSubtasks = (item.subtasks || []).map((s) =>
      s.id === subtaskId ? { ...s, done } : s
    );
    await onUpdateItem(item._id, { subtasks: updatedSubtasks });
  };

  // Add Subtask to an item
  const handleAddSubtask = async (item: TodoItem) => {
    const text = (newSubtaskText[item._id] || '').trim();
    if (!text) return;

    const newSub = {
      id: `sub-${Date.now()}`,
      text,
      done: false,
    };
    const updatedSubtasks = [...(item.subtasks || []), newSub];
    await onUpdateItem(item._id, { subtasks: updatedSubtasks });
    setNewSubtaskText((prev) => ({ ...prev, [item._id]: '' }));
  };

  // Total and completed statistics for current view
  const totalInView = displayedItems.length;
  const completedInView = displayedItems.filter((i) => i.done).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <ListTodo className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>To-Do Lists</span>
            </h2>
            <Badge className="bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-500/30 text-xs px-2 py-0.5 font-medium">
              Folders &amp; Subfolders
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1 max-w-xl">
            A fast, distraction-free to-do list organized with custom folders and subfolders. No schedules, no queues.
          </p>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingFolder(null);
                setSubfolderParentId(null);
                setFolderModalOpen(true);
              }}
              className="text-xs border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200 rounded-xl gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>New Folder</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Grid: Folder Explorer (left) + To-Do Content (right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* FOLDER EXPLORER SIDEBAR */}
        <div className="md:col-span-4 lg:col-span-4 space-y-3">
          <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 backdrop-blur-md shadow-xs space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Folders</span>
              </span>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingFolder(null);
                    setSubfolderParentId(null);
                    setFolderModalOpen(true);
                  }}
                  className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  title="Create Root Folder"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Views: All Items & Inbox */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setSelectedFolderId('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  selectedFolderId === 'all'
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-xs dark:bg-indigo-950/50 dark:border-indigo-500/30 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>All To-Dos</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-500">
                  {items.filter((i) => !i.done).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFolderId('inbox')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  selectedFolderId === 'inbox'
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-xs dark:bg-indigo-950/50 dark:border-indigo-500/30 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                  <span>Unorganized / Inbox</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-500">
                  {activeCountsByFolder['inbox'] || 0}
                </span>
              </button>
            </div>

            <div className="h-px bg-slate-200/80 dark:bg-white/5 my-2" />

            {/* Folders & Subfolders Tree */}
            <div className="space-y-1 max-h-[460px] overflow-y-auto pr-0.5">
              {rootFolders.length === 0 ? (
                <div className="text-center py-6 px-2 text-xs text-slate-500 dark:text-zinc-500">
                  <p>No folders yet.</p>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFolder(null);
                        setSubfolderParentId(null);
                        setFolderModalOpen(true);
                      }}
                      className="mt-2 text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create &ldquo;Action&rdquo; Folder</span>
                    </button>
                  )}
                </div>
              ) : (
                rootFolders.map((root) => {
                  const subfolders = subfoldersByParent[root._id] || [];
                  const isExpanded = expandedFolderIds.has(root._id);
                  const isSelected = selectedFolderId === root._id;
                  const colorStyle = COLOR_CLASSES[root.color || 'indigo'] || COLOR_CLASSES.indigo;
                  const count = activeCountsByFolder[root._id] || 0;

                  return (
                    <div key={root._id} className="space-y-0.5">
                      {/* Root Folder Row */}
                      <div
                        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-xs dark:bg-indigo-950/50 dark:border-indigo-500/30 dark:text-white'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/5'
                        }`}
                        onClick={() => setSelectedFolderId(root._id)}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {subfolders.length > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFolderExpanded(root._id);
                              }}
                              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <div className="w-3.5" />
                          )}

                          <span className={`w-2 h-2 rounded-full ${colorStyle.dot} shrink-0`} />
                          <span className="truncate">{root.name}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {count > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/60 dark:bg-white/10 font-semibold text-slate-700 dark:text-zinc-300">
                              {count}
                            </span>
                          )}

                          {isOwner && (
                            <div className="hidden group-hover:flex items-center gap-0.5 pl-1">
                              {/* Add Subfolder */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingFolder(null);
                                  setSubfolderParentId(root._id);
                                  setFolderModalOpen(true);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                title="Add Subfolder"
                              >
                                <Plus className="w-3 h-3" />
                              </button>

                              {/* Edit Folder */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingFolder(root);
                                  setSubfolderParentId(null);
                                  setFolderModalOpen(true);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white"
                                title="Edit Folder"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              {/* Delete Folder */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Delete folder "${root.name}" and all its to-dos?`)) {
                                    onDeleteFolder(root._id);
                                  }
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-500"
                                title="Delete Folder"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Subfolders (Indented) */}
                      {isExpanded && subfolders.length > 0 && (
                        <div className="pl-6 space-y-0.5 border-l border-slate-200 dark:border-white/5 ml-3">
                          {subfolders.map((sub) => {
                            const isSubSelected = selectedFolderId === sub._id;
                            const subColorStyle = COLOR_CLASSES[sub.color || 'indigo'] || COLOR_CLASSES.indigo;
                            const subCount = activeCountsByFolder[sub._id] || 0;

                            return (
                              <div
                                key={sub._id}
                                className={`group flex items-center justify-between px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                  isSubSelected
                                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-500/30 dark:text-white'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5'
                                }`}
                                onClick={() => setSelectedFolderId(sub._id)}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <CornerDownRight className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0" />
                                  <span className={`w-1.5 h-1.5 rounded-full ${subColorStyle.dot} shrink-0`} />
                                  <span className="truncate">{sub.name}</span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {subCount > 0 && (
                                    <span className="text-[10px] px-1 py-0 rounded bg-slate-200/60 dark:bg-white/10 font-semibold text-slate-700 dark:text-zinc-300">
                                      {subCount}
                                    </span>
                                  )}

                                  {isOwner && (
                                    <div className="hidden group-hover:flex items-center gap-0.5 pl-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingFolder(sub);
                                          setSubfolderParentId(root._id);
                                          setFolderModalOpen(true);
                                        }}
                                        className="p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                                        title="Edit Subfolder"
                                      >
                                        <Edit2 className="w-2.5 h-2.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm(`Delete subfolder "${sub.name}"?`)) {
                                            onDeleteFolder(sub._id);
                                          }
                                        }}
                                        className="p-0.5 text-slate-400 hover:text-rose-500"
                                        title="Delete Subfolder"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* TO-DO CONTENT AREA (right) */}
        <div className="md:col-span-8 lg:col-span-8 space-y-4">
          {/* Active Folder Header & Controls */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 backdrop-blur-md shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                {/* Breadcrumb Path */}
                {breadcrumbs.length > 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mb-1">
                    {breadcrumbs.map((b, idx) => (
                      <span key={b._id} className="flex items-center gap-1.5">
                        {idx > 0 && <span className="opacity-40">/</span>}
                        <button
                          type="button"
                          onClick={() => setSelectedFolderId(b._id)}
                          className="hover:underline hover:text-slate-900 dark:hover:text-white"
                        >
                          {b.name}
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    {activeFolder ? (
                      <>
                        <span className={`w-2.5 h-2.5 rounded-full ${COLOR_CLASSES[activeFolder.color || 'indigo']?.dot || 'bg-indigo-500'}`} />
                        <span>{activeFolder.name}</span>
                      </>
                    ) : selectedFolderId === 'inbox' ? (
                      <>
                        <Inbox className="w-5 h-5 text-slate-500" />
                        <span>Unorganized / Inbox</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <span>All To-Dos</span>
                      </>
                    )}
                  </h3>

                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-400 font-medium">
                    {completedInView} / {totalInView} completed
                  </span>
                </div>
              </div>

              {/* Filter Tabs (All / Active / Completed) */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/5 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    filterMode === 'all'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('active')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    filterMode === 'active'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('completed')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    filterMode === 'completed'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Done
                </button>
              </div>
            </div>

            {/* Quick Add Bar */}
            {isOwner && (
              <form onSubmit={handleAddTodo} className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    placeholder={
                      activeFolder
                        ? `Add to-do to "${activeFolder.name}"... (Press Enter)`
                        : 'Add a new to-do... (Press Enter)'
                    }
                    disabled={addingTodo}
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 rounded-xl focus:outline-hidden focus:border-indigo-500 transition-colors shadow-2xs"
                  />
                  {newTodoText.trim() && (
                    <button
                      type="submit"
                      disabled={addingTodo}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                      title="Add To-Do"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Search filter if there are items */}
            {items.length > 3 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter to-dos in this view..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50/50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-white/5 text-slate-800 dark:text-zinc-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* TO-DO ITEMS LIST */}
          <div className="space-y-2">
            {displayedItems.length === 0 ? (
              <div className="py-14 px-4 text-center rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {searchQuery ? 'No matching to-dos found' : 'No to-dos here!'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try clearing the search query.'
                    : 'Use the bar above to quickly add tasks to this list.'}
                </p>
              </div>
            ) : (
              displayedItems.map((item) => {
                const itemFolder = item.folderId ? folderMap.get(item.folderId) : null;
                const isEditing = editingItemId === item._id;
                const subtasks = item.subtasks || [];
                const isSubtasksExpanded = expandedSubtaskItemIds.has(item._id);

                return (
                  <div
                    key={item._id}
                    className={`group rounded-xl border transition-all duration-150 p-3 sm:p-3.5 bg-white dark:bg-zinc-950/80 ${
                      item.done
                        ? 'border-slate-200/60 dark:border-white/5 bg-slate-50/60 dark:bg-zinc-950/40'
                        : 'border-slate-200/80 dark:border-white/10 shadow-2xs hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        type="button"
                        disabled={!isOwner}
                        onClick={() => onUpdateItem(item._id, { done: !item.done })}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                          item.done
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'border-slate-300 dark:border-white/20 bg-white dark:bg-zinc-900 hover:border-indigo-500'
                        }`}
                        title={item.done ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {item.done && <Check className="w-3.5 h-3.5" />}
                      </button>

                      {/* Content / Inline Edit */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingItemText}
                              onChange={(e) => setEditingItemText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveItemEdit(item._id);
                                if (e.key === 'Escape') setEditingItemId(null);
                              }}
                              autoFocus
                              className="w-full text-xs sm:text-sm px-2 py-1 bg-slate-100 dark:bg-zinc-900 border border-indigo-500 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveItemEdit(item._id)}
                              className="h-7 px-2 text-xs bg-indigo-600 text-white"
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <div
                            onDoubleClick={() => isOwner && handleStartEditItem(item)}
                            className="cursor-pointer"
                          >
                            <p
                              className={`text-xs sm:text-sm font-medium leading-relaxed break-words ${
                                item.done
                                  ? 'line-through text-slate-400 dark:text-zinc-500'
                                  : 'text-slate-800 dark:text-zinc-200'
                              }`}
                            >
                              {item.text}
                            </p>

                            {/* Tags / Folder & Subtask Info Row */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {/* Folder Badge (visible in 'all' view) */}
                              {selectedFolderId === 'all' && itemFolder && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedFolderId(itemFolder._id)}
                                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-white/5 transition-colors"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${COLOR_CLASSES[itemFolder.color || 'indigo']?.dot || 'bg-indigo-500'}`} />
                                  <span>{itemFolder.name}</span>
                                </button>
                              )}

                              {/* Subtasks Count Pill */}
                              {subtasks.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedSubtaskItemIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(item._id)) next.delete(item._id);
                                      else next.add(item._id);
                                      return next;
                                    });
                                  }}
                                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-white/5 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 transition-colors"
                                >
                                  <span>
                                    {subtasks.filter((s) => s.done).length}/{subtasks.length} subtasks
                                  </span>
                                  {isSubtasksExpanded ? (
                                    <ChevronDown className="w-2.5 h-2.5" />
                                  ) : (
                                    <ChevronRight className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Item Actions */}
                      {isOwner && (
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          {/* Add Subtask Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedSubtaskItemIds((prev) => new Set(prev).add(item._id));
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                            title="Add subtask / checklist item"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {/* Move to another folder */}
                          <select
                            value={item.folderId || ''}
                            onChange={(e) =>
                              onUpdateItem(item._id, {
                                folderId: e.target.value ? e.target.value : null,
                              })
                            }
                            className="text-[11px] bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 rounded-md px-1.5 py-0.5 max-w-[100px] truncate focus:outline-hidden"
                            title="Move to folder"
                          >
                            <option value="">No folder</option>
                            {folders.map((f) => (
                              <option key={f._id} value={f._id}>
                                {f.parentId ? '↳ ' : ''}{f.name}
                              </option>
                            ))}
                          </select>

                          {/* Edit Text */}
                          <button
                            type="button"
                            onClick={() => handleStartEditItem(item)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                            title="Edit To-Do"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item._id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                            title="Delete To-Do"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Collapsible Subtasks Area */}
                    {isSubtasksExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 dark:border-white/5 pl-8 space-y-1.5">
                        {subtasks.map((sub) => (
                          <div key={sub.id} className="flex items-center gap-2 group/sub">
                            <input
                              type="checkbox"
                              checked={sub.done}
                              disabled={!isOwner}
                              onChange={(e) => handleToggleSubtask(item, sub.id, e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 dark:border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                            <span
                              className={`text-xs flex-1 truncate ${
                                sub.done
                                  ? 'line-through text-slate-400 dark:text-zinc-500'
                                  : 'text-slate-700 dark:text-zinc-300'
                              }`}
                            >
                              {sub.text}
                            </span>
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = subtasks.filter((s) => s.id !== sub.id);
                                  onUpdateItem(item._id, { subtasks: updated });
                                }}
                                className="opacity-0 group-hover/sub:opacity-100 p-0.5 text-slate-400 hover:text-rose-500"
                                title="Remove subtask"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Quick Add Subtask Input */}
                        {isOwner && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <input
                              type="text"
                              value={newSubtaskText[item._id] || ''}
                              onChange={(e) =>
                                setNewSubtaskText((prev) => ({ ...prev, [item._id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddSubtask(item);
                                }
                              }}
                              placeholder="Add subtask / checklist step..."
                              className="text-xs px-2 py-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white flex-1 focus:outline-hidden focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddSubtask(item)}
                              disabled={!newSubtaskText[item._id]?.trim()}
                              className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-white disabled:opacity-40"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Folder Create / Edit Modal */}
      <TodoFolderModal
        open={folderModalOpen}
        onOpenChange={setFolderModalOpen}
        folder={editingFolder}
        initialParentId={subfolderParentId}
        availableFolders={folders}
        onSave={async (data) => {
          if (editingFolder) {
            await onUpdateFolder(editingFolder._id, data);
          } else {
            await onCreateFolder(data);
          }
        }}
      />
    </div>
  );
}
