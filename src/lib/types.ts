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

