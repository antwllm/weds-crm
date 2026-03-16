import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivityLog } from '@/hooks/useSettings';

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  email_received: 'Email recu',
  sms_sent: 'SMS envoye',
  email_sent: 'Email envoye',
  status_change: 'Changement de statut',
  note_added: 'Note ajoutee',
  duplicate_inquiry: 'Demande en double',
  notification_failed: 'Notification echouee',
  pipedrive_synced: 'Sync Pipedrive',
  whatsapp_sent: 'WhatsApp envoye',
  whatsapp_received: 'WhatsApp recu',
};

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  email_received: 'bg-blue-100 text-blue-800',
  sms_sent: 'bg-green-100 text-green-800',
  email_sent: 'bg-indigo-100 text-indigo-800',
  status_change: 'bg-yellow-100 text-yellow-800',
  note_added: 'bg-gray-100 text-gray-800',
  duplicate_inquiry: 'bg-orange-100 text-orange-800',
  notification_failed: 'bg-red-100 text-red-800',
  pipedrive_synced: 'bg-purple-100 text-purple-800',
  whatsapp_sent: 'bg-emerald-100 text-emerald-800',
  whatsapp_received: 'bg-teal-100 text-teal-800',
};

const PAGE_SIZE = 50;

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "A l'instant";
  if (diffMin < 60) return `Il y a ${diffMin}min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD < 7) return `Il y a ${diffD}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function ActivityLog() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useActivityLog({
    type: typeFilter === 'all' ? undefined : typeFilter,
    limit: PAGE_SIZE,
    offset,
  });

  const handleTypeChange = (value: string | null) => {
    if (!value) return;
    setTypeFilter(value);
    setOffset(0);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Journal d'activite</CardTitle>
        <Select value={typeFilter} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-5 w-24 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : !data?.activities.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune activite
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {data.activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 py-2 border-b last:border-0"
                >
                  <Badge
                    variant="secondary"
                    className={`text-xs shrink-0 ${ACTIVITY_TYPE_COLORS[activity.type] || ''}`}
                  >
                    {ACTIVITY_TYPE_LABELS[activity.type] || activity.type}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/leads/${activity.leadId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {activity.leadName}
                    </Link>
                    {activity.content && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {activity.content}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatRelativeTime(activity.createdAt)}
                  </span>
                </div>
              ))}
            </div>

            {data.total > offset + PAGE_SIZE && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                >
                  Charger plus
                </Button>
              </div>
            )}

            {offset > 0 && (
              <div className="flex justify-center mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                >
                  Page precedente
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
