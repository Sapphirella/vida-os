import { useUIStore } from '@/stores/useUIStore';
import { SegmentedControl } from '@/components/notes/SegmentedControl';
import { InspirationView } from '@/components/notes/InspirationView';
import { ScheduleView } from '@/components/notes/ScheduleView';
import { TodoView } from '@/components/notes/TodoView';

export function NotesPage() {
  const tab = useUIStore((s) => s.notesTab);
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
