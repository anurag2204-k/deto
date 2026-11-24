import { ActivityMap, LightweightTopic, RingFrequency, RingSettings, Topic, TopicFile, TopicQueueItem, Task, TodoFolder, TodoItem, GymLog, GymSet } from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) errorMsg = data.error;
    } catch {
      // Non-json error
    }
    throw new ApiError(errorMsg, res.status);
  }
  return res.json() as Promise<T>;
}

export async function getMe(): Promise<{ isOwner: boolean }> {
  return request<{ isOwner: boolean }>('/api/auth/me');
}

export async function login(username: string, password: string): Promise<{ isOwner: boolean }> {
  return request<{ isOwner: boolean }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<void> {
  await request<{ success: boolean }>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getTopics(
  view: 'queue' | 'due' | 'ring',
  today?: string
): Promise<LightweightTopic[]> {
  const query = new URLSearchParams({ view });
  if (today) {
    query.set('today', today);
  }
  return request<LightweightTopic[]>(`/api/topics?${query.toString()}`);
}

export async function getTopic(id: string): Promise<Topic> {
  return request<Topic>(`/api/topics/${id}`);
}

export async function createTopic(data: {
  title: string;
  studiedOn: string;
  notes?: string;
  links?: { url: string; label: string }[];
  files?: TopicFile[];
  ring?: RingSettings;
}): Promise<Topic> {
  return request<Topic>('/api/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateTopic(
  id: string,
  data: {
    title?: string;
    studiedOn?: string;
    notes?: string;
    links?: { url: string; label: string }[];
    files?: TopicFile[];
    ring?: RingSettings;
    queueItems?: TopicQueueItem[];
  }
): Promise<Topic> {
  return request<Topic>(`/api/topics/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateTopicQueue(
  id: string,
  queueItems: TopicQueueItem[]
): Promise<Topic> {
  return request<Topic>(`/api/topics/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queueItems }),
  });
}

export async function updateTopicRing(
  id: string,
  ring: {
    active: boolean;
    frequency?: RingFrequency;
    targetDays?: number;
    targetPeriod?: 'week' | 'month';
    color?: string;
    lastStudiedAt?: string;
  }
): Promise<LightweightTopic> {
  return request<LightweightTopic>(`/api/topics/${id}/ring`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ring),
  });
}

export async function logRingSession(id: string, today: string): Promise<LightweightTopic> {
  return request<LightweightTopic>(`/api/topics/${id}/ring-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ today }),
  });
}

export async function deleteTopic(id: string): Promise<void> {
  await request<{ success: boolean }>(`/api/topics/${id}`, {
    method: 'DELETE',
  });
}

export async function queueDone(id: string): Promise<LightweightTopic> {
  return request<LightweightTopic>(`/api/topics/${id}/queue-done`, {
    method: 'POST',
  });
}

export async function revisionDone(id: string, today: string): Promise<LightweightTopic> {
  return request<LightweightTopic>(`/api/topics/${id}/revision-done?today=${encodeURIComponent(today)}`, {
    method: 'POST',
  });
}

export async function moveTopic(id: string, prevId: string | null, nextId: string | null): Promise<void> {
  await request<{ success: boolean }>(`/api/topics/${id}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prevId, nextId }),
  });
}

export async function uploadFile(file: File): Promise<TopicFile> {
  const formData = new FormData();
  formData.append('file', file);
  return request<TopicFile>('/api/files', {
    method: 'POST',
    body: formData,
  });
}

export async function getActivity(): Promise<ActivityMap> {
  return request<ActivityMap>('/api/activity');
}

export async function deleteFile(fileId: string): Promise<void> {
  await request<{ success: boolean }>(`/api/files/${fileId}`, {
    method: 'DELETE',
  });
}

// ================= Tasks API =================
export async function getTasks(): Promise<Task[]> {
  return request<Task[]>('/api/tasks');
}

export async function getTask(id: string): Promise<Task> {
  return request<Task>(`/api/tasks/${id}`);
}

export async function createTask(data: {
  title: string;
  description?: string;
  color?: string;
  frequency?: RingFrequency;
  targetDays?: number;
  targetPeriod?: 'week' | 'month';
  todos?: Array<{ id?: string; text: string; done?: boolean }>;
  linkedTopicIds?: string[];
}): Promise<Task> {
  return request<Task>('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateTask(
  id: string,
  data: Partial<Omit<Task, 'todos'>> & {
    todos?: Array<{ id?: string; text: string; done?: boolean }>;
    frequency?: RingFrequency;
    targetDays?: number;
    targetPeriod?: 'week' | 'month';
  }
): Promise<Task> {
  return request<Task>(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await request<{ success: boolean }>(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
}

export async function logTaskSession(id: string, date: string): Promise<Task> {
  return request<Task>(`/api/tasks/${id}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  });
}

export async function toggleTaskTodo(id: string, todoId: string, done: boolean): Promise<Task> {
  return request<Task>(`/api/tasks/${id}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ todoId, done }),
  });
}

export async function addTaskTodo(id: string, text: string): Promise<Task> {
  return request<Task>(`/api/tasks/${id}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addText: text }),
  });
}

// ----------------------------------------------------
// Standalone To-Do List APIs (Folders & To-Dos)
// ----------------------------------------------------

export async function getTodos(): Promise<{ folders: TodoFolder[]; items: TodoItem[] }> {
  return request<{ folders: TodoFolder[]; items: TodoItem[] }>('/api/todos');
}

export async function createTodoFolder(data: {
  name: string;
  parentId?: string | null;
  color?: string;
}): Promise<TodoFolder> {
  return request<TodoFolder>('/api/todos/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateTodoFolder(
  id: string,
  data: {
    name?: string;
    parentId?: string | null;
    color?: string;
    order?: number;
  }
): Promise<TodoFolder> {
  return request<TodoFolder>(`/api/todos/folders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteTodoFolder(id: string): Promise<void> {
  await request<{ success: boolean }>(`/api/todos/folders/${id}`, {
    method: 'DELETE',
  });
}

export async function createTodoItem(data: {
  text: string;
  folderId?: string | null;
  notes?: string;
  subtasks?: Array<{ id?: string; text: string; done?: boolean }>;
}): Promise<TodoItem> {
  return request<TodoItem>('/api/todos/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateTodoItem(
  id: string,
  data: Partial<{
    text: string;
    done: boolean;
    folderId: string | null;
    notes?: string;
    order: number;
    subtasks: Array<{ id: string; text: string; done: boolean }>;
  }>
): Promise<TodoItem> {
  return request<TodoItem>(`/api/todos/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteTodoItem(id: string): Promise<void> {
  await request<{ success: boolean }>(`/api/todos/items/${id}`, {
    method: 'DELETE',
  });
}

export async function getGymLogs(query?: {
  exerciseId?: string;
  dayKey?: string;
  date?: string;
}): Promise<GymLog[]> {
  const params = new URLSearchParams();
  if (query?.exerciseId) params.set('exerciseId', query.exerciseId);
  if (query?.dayKey) params.set('dayKey', query.dayKey);
  if (query?.date) params.set('date', query.date);
  const qStr = params.toString();
  return request<GymLog[]>(`/api/gym${qStr ? `?${qStr}` : ''}`);
}

export async function saveGymLog(data: {
  exerciseId: string;
  exerciseName: string;
  dayKey: string;
  date?: string;
  slots: GymSet[];
  notes?: string;
}): Promise<GymLog> {
  return request<GymLog>('/api/gym', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateGymLog(
  id: string,
  data: {
    slots?: GymSet[];
    notes?: string;
    date?: string;
  }
): Promise<GymLog> {
  return request<GymLog>(`/api/gym/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteGymLog(id: string): Promise<{ success: boolean; deletedId: string }> {
  return request<{ success: boolean; deletedId: string }>(`/api/gym/${id}`, {
    method: 'DELETE',
  });
}


