'use client';

import { useRouter } from 'next/navigation';
import { NoteEditor } from '@/components/NoteEditor';
import { createTopic } from '@/lib/api';
import { TopicFile, TopicLink, RingSettings } from '@/lib/types';

export default function NewTopicPage() {
  const router = useRouter();

  const handleSave = async (data: {
    title: string;
    studiedOn: string;
    notes?: string;
    links: TopicLink[];
    files: TopicFile[];
    ring?: RingSettings;
  }) => {
    await createTopic(data);
    router.push('/');
    router.refresh();
  };

  return (
    <NoteEditor
      onSave={handleSave}
      onCancel={() => router.push('/')}
    />
  );
}
