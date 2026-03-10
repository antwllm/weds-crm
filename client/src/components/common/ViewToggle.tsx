import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';

type View = 'board' | 'list';

interface ViewToggleProps {
  view: View;
  onViewChange: (view: View) => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex gap-1">
      <Button
        variant={view === 'board' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewChange('board')}
      >
        <LayoutGrid className="size-4" data-icon="inline-start" />
        Tableau
      </Button>
      <Button
        variant={view === 'list' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewChange('list')}
      >
        <List className="size-4" data-icon="inline-start" />
        Liste
      </Button>
    </div>
  );
}
