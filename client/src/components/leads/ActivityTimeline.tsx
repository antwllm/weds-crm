import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import {
  Mail,
  MessageSquare,
  MessageCircle,
  Send,
  ArrowRight,
  StickyNote,
  Copy,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { ACTIVITY_TYPE_LABELS } from '@/lib/constants';
import type { Activity, ActivityType } from '@/types';

const ICON_MAP: Record<string, React.ElementType> = {
  Mail,
  MessageSquare,
  MessageCircle,
  Send,
  ArrowRight,
  StickyNote,
  Copy,
  AlertTriangle,
  RefreshCw,
};

function getActivityContent(activity: Activity): string {
  if (activity.type === 'status_change' && activity.metadata) {
    const from = (activity.metadata as Record<string, string>).from || '(aucun)';
    const to = (activity.metadata as Record<string, string>).to || '(aucun)';
    return `Statut : ${from} → ${to}`;
  }
  if (activity.type === 'note_added') {
    return activity.content || '';
  }
  return activity.content || '';
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (!activities.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aucune activit\u00e9
      </p>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical connecting line */}
      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />

      {activities.map((activity) => {
        const typeInfo = ACTIVITY_TYPE_LABELS[activity.type as ActivityType];
        const IconComponent = typeInfo ? ICON_MAP[typeInfo.icon] : Mail;
        const colorClass = typeInfo?.color || 'text-gray-500';
        const typeLabel = typeInfo?.label || activity.type;
        const content = getActivityContent(activity);
        const timeAgo = activity.createdAt
          ? formatDistanceToNow(new Date(activity.createdAt), {
              addSuffix: true,
              locale: fr,
            })
          : '';

        return (
          <div key={activity.id} className="relative flex gap-3 py-2 pl-1">
            {/* Icon dot */}
            <div
              className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background ring-2 ring-border ${colorClass}`}
            >
              {IconComponent && <IconComponent className="h-3 w-3" />}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className={`text-xs font-medium ${colorClass}`}>
                  {typeLabel}
                </span>
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
              </div>
              {content && (
                <p className="mt-0.5 text-sm text-foreground whitespace-pre-wrap">
                  {content}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
