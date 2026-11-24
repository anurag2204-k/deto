import { ObjectId } from 'mongodb';

export const INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
export const ALLOWED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME)[number];

export interface TopicLink {
  url: string;
  label: string;
}

export interface TopicFileDoc {
  fileId: ObjectId;
  name: string;
  type: string;
  size: number;
}

export interface TopicFile {
  fileId: string;
  name: string;
  type: string;
  size: number;
}

export interface TopicRevision {
  stage: number;
  nextDueAt: string; // YYYY-MM-DD
}

export type RingFrequency =
  | 'daily'
  | '4x-week'
  | '3x-week'
  | '2x-week'
  | '1x-week'
  | '5x-week'
  | '6x-week'
  | 'every-2-days'
  | 'weekly'
  | '10x-month'
  | '15x-month'
  | '20x-month'
  | 'custom';

export type RingColor = 'emerald' | 'amber' | 'indigo' | 'rose' | 'cyan' | 'violet';

export interface RingSettings {
  active: boolean; // Currently active habit / ring
  frequency: RingFrequency; // Cadence target
  targetDays?: number; // e.g., 4 for 4 days a week, 15 for 15 days a month
  targetPeriod?: 'week' | 'month'; // 'week' or 'month'
  color?: RingColor; // Theme color (e.g., emerald for Gym)
  lastStudiedAt?: string; // YYYY-MM-DD
  sessionsCount?: number; // Total sessions logged
  history?: string[]; // Dates when sessions were completed [YYYY-MM-DD]
}

export interface TopicQueueItem {
  id: string;
  text: string;
  reasoning?: string;
  order: number;
  completed: boolean;
  reviewCount: number;
  lastReviewedAt?: string;
  createdAt: string;
}

export interface TopicDoc {
  _id: ObjectId;
  title: string;
  studiedOn: string; // YYYY-MM-DD
  notes?: string;
  links?: TopicLink[];
  files?: TopicFileDoc[];
  queuePos: number;
  revision: TopicRevision;
  ring?: RingSettings;
  queueItems?: TopicQueueItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Topic {
  _id: string;
  title: string;
  studiedOn: string;
  notes?: string;
  links: TopicLink[];
  files: TopicFile[];
  queuePos: number;
  revision: TopicRevision;
  ring?: RingSettings;
  queueItems?: TopicQueueItem[];
  createdAt: string;
  updatedAt: string;
}

export interface LightweightTopic {
  _id: string;
  title: string;
  studiedOn: string;
  queuePos: number;
  revision: TopicRevision;
  ring?: RingSettings;
}

export interface MoveRequestBody {
  prevId: string | null;
  nextId: string | null;
}

export interface ActivityDoc {
  _id?: ObjectId;
  date: string; // YYYY-MM-DD
  queue?: boolean; // Blue: Queue or Revision done
  ring?: boolean; // Yellow: Study Ring session done
  count?: number;
  updatedAt: Date;
}

export type ActivityMap = Record<string, { queue?: boolean; ring?: boolean; count?: number }>;

export function serializeLightweightTopic(doc: TopicDoc): LightweightTopic {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    studiedOn: doc.studiedOn,
    queuePos: doc.queuePos,
    revision: doc.revision,
    ring: doc.ring,
  };
}

export function serializeTopic(doc: TopicDoc): Topic {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    studiedOn: doc.studiedOn,
    notes: doc.notes,
    links: doc.links || [],
    files: (doc.files || []).map((f) => ({
      fileId: f.fileId.toString(),
      name: f.name,
      type: f.type,
      size: f.size,
    })),
    queuePos: doc.queuePos,
    revision: doc.revision,
    ring: doc.ring,
    queueItems: doc.queueItems || [],
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export interface TaskTodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskSchedule {
  frequency: RingFrequency;
  targetDays: number;
  targetPeriod: 'week' | 'month';
  daysOfWeek?: number[];
}

export interface TaskDoc {
  _id: ObjectId;
  title: string;
  description?: string;
  color: RingColor;
  schedule: TaskSchedule;
  todos: TaskTodoItem[];
  linkedTopicIds: string[];
  history: string[];
  lastCompletedAt?: string;
  sessionsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  color: RingColor;
  schedule: TaskSchedule;
  todos: TaskTodoItem[];
  linkedTopicIds: string[];
  history: string[];
  lastCompletedAt?: string;
  sessionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export function serializeTask(doc: TaskDoc): Task {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    color: doc.color || 'emerald',
    schedule: doc.schedule || {
      frequency: '4x-week',
      targetDays: 4,
      targetPeriod: 'week',
    },
    todos: doc.todos || [],
    linkedTopicIds: (doc.linkedTopicIds || []).map(String),
    history: doc.history || [],
    lastCompletedAt: doc.lastCompletedAt,
    sessionsCount: typeof doc.sessionsCount === 'number' ? doc.sessionsCount : 0,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

// ----------------------------------------------------
// Standalone Hierarchical To-Do Lists (Folders & Subfolders)
// ----------------------------------------------------

export interface TodoFolderDoc {
  _id: ObjectId;
  name: string;
  parentId?: ObjectId | null;
  color?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoFolder {
  _id: string;
  name: string;
  parentId: string | null;
  color?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TodoSubtask {
  id: string;
  text: string;
  done: boolean;
}

export interface TodoItemDoc {
  _id: ObjectId;
  folderId?: ObjectId | null;
  text: string;
  done: boolean;
  notes?: string;
  order: number;
  subtasks?: TodoSubtask[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoItem {
  _id: string;
  folderId: string | null;
  text: string;
  done: boolean;
  notes?: string;
  order: number;
  subtasks: TodoSubtask[];
  createdAt: string;
  updatedAt: string;
}

export function serializeTodoFolder(doc: TodoFolderDoc): TodoFolder {
  return {
    _id: doc._id.toString(),
    name: doc.name,
    parentId: doc.parentId ? doc.parentId.toString() : null,
    color: doc.color || 'indigo',
    order: typeof doc.order === 'number' ? doc.order : 0,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export function serializeTodoItem(doc: TodoItemDoc): TodoItem {
  return {
    _id: doc._id.toString(),
    folderId: doc.folderId ? doc.folderId.toString() : null,
    text: doc.text,
    done: Boolean(doc.done),
    notes: doc.notes,
    order: typeof doc.order === 'number' ? doc.order : 0,
    subtasks: doc.subtasks || [],
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export interface GymSet {
  setNumber: number;
  weight: number; // in kg
  reps: number;
  rpe?: number;
  completed?: boolean;
}

export interface GymLogDoc {
  _id: ObjectId;
  exerciseId: string;
  exerciseName: string;
  dayKey: string;
  date: string; // YYYY-MM-DD
  slots: GymSet[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GymLog {
  _id: string;
  exerciseId: string;
  exerciseName: string;
  dayKey: string;
  date: string;
  slots: GymSet[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function serializeGymLog(doc: GymLogDoc): GymLog {
  return {
    _id: doc._id.toString(),
    exerciseId: doc.exerciseId,
    exerciseName: doc.exerciseName,
    dayKey: doc.dayKey,
    date: doc.date,
    slots: doc.slots || [],
    notes: doc.notes,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}



