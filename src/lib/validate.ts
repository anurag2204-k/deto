import { ObjectId } from 'mongodb';
import { ALLOWED_MIME, MAX_FILE_BYTES, TopicLink, TopicFileDoc } from './types';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  if (!ObjectId.isValid(id)) return false;
  return new ObjectId(id).toString() === id;
}

export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || !DATE_REGEX.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function validateTitle(title: unknown): { valid: boolean; value?: string; error?: string } {
  if (typeof title !== 'string') {
    return { valid: false, error: 'Title is required and must be a string' };
  }
  const trimmed = title.trim();
  if (trimmed.length < 1 || trimmed.length > 200) {
    return { valid: false, error: 'Title must be between 1 and 200 characters' };
  }
  return { valid: true, value: trimmed };
}

export function validateStudiedOn(dateStr: unknown): { valid: boolean; value?: string; error?: string } {
  if (typeof dateStr !== 'string' || !isValidDateString(dateStr)) {
    return { valid: false, error: 'studiedOn must be a valid date in YYYY-MM-DD format' };
  }
  return { valid: true, value: dateStr };
}

export function validateNotes(notes: unknown): { valid: boolean; value?: string; error?: string } {
  if (notes === undefined || notes === null || notes === '') {
    return { valid: true, value: undefined };
  }
  if (typeof notes !== 'string') {
    return { valid: false, error: 'Notes must be a string' };
  }
  if (notes.length > 50000) {
    return { valid: false, error: 'Notes cannot exceed 50,000 characters' };
  }
  return { valid: true, value: notes };
}

export function sanitizeLinks(rawLinks: unknown): { valid: boolean; value?: TopicLink[]; error?: string } {
  if (rawLinks === undefined || rawLinks === null) {
    return { valid: true, value: [] };
  }
  if (!Array.isArray(rawLinks)) {
    return { valid: false, error: 'Links must be an array' };
  }
  if (rawLinks.length > 50) {
    return { valid: false, error: 'Maximum of 50 links allowed' };
  }

  const links: TopicLink[] = [];
  for (const item of rawLinks) {
    if (!item || typeof item !== 'object') {
      return { valid: false, error: 'Each link must be an object' };
    }
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    if (!url) {
      return { valid: false, error: 'Link url is required' };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { valid: false, error: `Invalid URL: ${url}` };
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { valid: false, error: 'Links must use http or https protocol' };
    }

    let label = typeof item.label === 'string' ? item.label.trim() : '';
    if (!label) {
      label = parsedUrl.hostname;
    }

    links.push({ url, label });
  }

  return { valid: true, value: links };
}

export function sanitizeFiles(rawFiles: unknown): { valid: boolean; value?: TopicFileDoc[]; error?: string } {
  if (rawFiles === undefined || rawFiles === null) {
    return { valid: true, value: [] };
  }
  if (!Array.isArray(rawFiles)) {
    return { valid: false, error: 'Files must be an array' };
  }
  if (rawFiles.length > 50) {
    return { valid: false, error: 'Maximum of 50 files allowed' };
  }

  const files: TopicFileDoc[] = [];
  for (const item of rawFiles) {
    if (!item || typeof item !== 'object') {
      return { valid: false, error: 'Each file must be an object' };
    }
    const { fileId, name, type, size } = item;
    if (typeof fileId !== 'string' || !isValidObjectId(fileId)) {
      return { valid: false, error: 'Invalid fileId' };
    }
    if (typeof name !== 'string' || !name.trim()) {
      return { valid: false, error: 'File name is required' };
    }
    if (typeof type !== 'string' || !(ALLOWED_MIME as readonly string[]).includes(type)) {
      return { valid: false, error: `Disallowed file type: ${type}` };
    }
    if (typeof size !== 'number' || size <= 0 || size > MAX_FILE_BYTES) {
      return { valid: false, error: 'File size exceeds 20MB or is invalid' };
    }

    files.push({
      fileId: new ObjectId(fileId),
      name: name.trim(),
      type,
      size,
    });
  }

  return { valid: true, value: files };
}
