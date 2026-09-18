import { useEffect } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { SegmentedControl } from '@/components/notes/SegmentedControl';
import { InspirationView } from '@/components/notes/InspirationView';
import { ScheduleView } from '@/components/notes/ScheduleView';
import { TodoView } from '@/components/notes/TodoView';

export function NotesPage() {
  const tab = useUIStore((s) => s.notesTab);
  const setNotesTab = useUIStore((s) => s.setNotesTab);
  const focusRequest = useUIStore((s) => s.focusRequest);

  // 全局查找跳到「灵感」时，自动切到灵感块
  useEffect(() => {
    if (focusRequest?.kind === 'inspiration') setNotesTab('inspiration');
  }, [focusRequest, setNotesTab]);

  return (
    <div className="px-4 sm:px-6 view-enter">
      <div className="max-w-5xl mx-auto pb-6">
        <SegmentedControl />
        <div>
          {tab === 'inspiration' && <InspirationView />}
          {tab === 'schedule' && <ScheduleView />}
          {tab === 'todo' && <TodoView />}
        </div>
      </div>
    </div>
  );
}
