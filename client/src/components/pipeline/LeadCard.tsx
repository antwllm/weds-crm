import { useNavigate } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Banknote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Lead } from '@/types';

interface LeadCardProps {
  lead: Lead;
  isDragging?: boolean;
  style?: React.CSSProperties;
  /** Spread dnd-kit attributes and listeners here */
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
  dragRef?: (node: HTMLElement | null) => void;
}

const budgetFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatEventDate(eventDate: string | null): string | null {
  if (!eventDate) return null;
  try {
    // Handle DD/MM/YYYY format from Pipedrive
    const ddmmyyyy = eventDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      if (isValid(date)) return format(date, 'd MMM yyyy', { locale: fr });
      return eventDate;
    }
    // Handle ISO format YYYY-MM-DD
    const date = parseISO(eventDate);
    if (!isValid(date)) return eventDate;
    return format(date, 'd MMM yyyy', { locale: fr });
  } catch {
    return eventDate;
  }
}

export function LeadCard({
  lead,
  isDragging,
  style,
  dragAttributes,
  dragListeners,
  dragRef,
}: LeadCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/leads/${lead.id}`);
  };

  const formattedDate = formatEventDate(lead.eventDate);

  return (
    <Card
      ref={dragRef}
      size="sm"
      className={`shrink-0 cursor-pointer transition-shadow hover:shadow-md ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
      style={{ ...style, flexShrink: 0 }}
      onClick={handleClick}
      {...dragAttributes}
      {...dragListeners}
    >
      <CardContent className="space-y-1.5 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium leading-tight truncate">
            {lead.name || 'Sans nom'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {formattedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {formattedDate}
            </span>
          )}
          {lead.budget != null && (
            <span className="flex items-center gap-1">
              <Banknote className="size-3" />
              {budgetFormatter.format(lead.budget)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
