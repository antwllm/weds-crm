import { Badge } from '@/components/ui/badge';
import { SOURCE_BADGES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface SourceBadgeProps {
  source: string;
  className?: string;
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const config = SOURCE_BADGES[source] ?? {
    label: source || 'Inconnu',
    color: 'bg-gray-100 text-gray-800',
  };

  return (
    <Badge
      variant="secondary"
      className={cn('text-xs', config.color, className)}
    >
      {config.label}
    </Badge>
  );
}
