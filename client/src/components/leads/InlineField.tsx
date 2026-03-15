import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface InlineFieldProps {
  value: string;
  onSave: (newValue: string) => void;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'date' | 'number' | 'textarea' | 'select';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  displayValue?: string;
  renderValue?: (value: string) => React.ReactNode;
}

export function InlineField({
  value,
  onSave,
  label,
  type = 'text',
  placeholder = '',
  options = [],
  displayValue,
  renderValue,
}: InlineFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const editingRef = useRef(false);

  useEffect(() => {
    // Don't reset draft while user is actively editing (avoids stale closure overwrites)
    if (!editingRef.current) {
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  function handleSave() {
    setEditing(false);
    editingRef.current = false;
    const trimmed = draft.trim();
    if (trimmed !== value) {
      if (type === 'number') {
        const num = parseFloat(trimmed);
        onSave(isNaN(num) ? '' : String(num));
      } else {
        onSave(trimmed);
      }
    }
  }

  function handleCancel() {
    setDraft(value);
    setEditing(false);
    editingRef.current = false;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }

  if (type === 'select' && editing) {
    return (
      <div className="space-y-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Select
          value={draft}
          onValueChange={(val: string | null) => {
            setEditing(false);
            if (val != null && val !== value) {
              onSave(val);
            }
          }}
          defaultOpen
          onOpenChange={(open: boolean) => {
            if (!open) setEditing(false);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        {type === 'textarea' ? (
          <Textarea
            ref={inputRef as React.Ref<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="text-sm"
          />
        ) : (
          <Input
            ref={inputRef as React.Ref<HTMLInputElement>}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="text-sm"
          />
        )}
      </div>
    );
  }

  const displayLabel = options.find((o) => o.value === value)?.label;

  return (
    <div
      className={cn(
        'cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:bg-muted',
        'space-y-0.5'
      )}
      onClick={() => { setEditing(true); editingRef.current = true; }}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-sm font-medium">
        {renderValue
          ? renderValue(value)
          : displayValue || displayLabel || value || <span className="text-muted-foreground">--</span>}
      </div>
    </div>
  );
}
