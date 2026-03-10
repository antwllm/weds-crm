import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useCreateLead } from '@/hooks/useLeads';
import { SOURCE_BADGES } from '@/lib/constants';
import { toast } from 'sonner';
import type { CreateLeadRequest } from '@/types';

export function LeadForm() {
  const navigate = useNavigate();
  const createLead = useCreateLead();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [source, setSource] = useState('manuel');
  const [budget, setBudget] = useState('');
  const [message, setMessage] = useState('');
  const [nameError, setNameError] = useState('');

  const sourceOptions = Object.entries(SOURCE_BADGES).map(([value, info]) => ({
    value,
    label: info.label,
  }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameError('');

    if (!name.trim()) {
      setNameError('Le nom est requis');
      return;
    }

    const data: CreateLeadRequest = {
      name: name.trim(),
    };
    if (email.trim()) data.email = email.trim();
    if (phone.trim()) data.phone = phone.trim();
    if (eventDate.trim()) data.eventDate = eventDate.trim();
    if (source) data.source = source;
    if (budget.trim()) {
      const num = parseFloat(budget.trim());
      if (!isNaN(num)) data.budget = num;
    }
    if (message.trim()) data.message = message.trim();

    createLead.mutate(data, {
      onSuccess: (lead) => {
        toast.success('Lead cree');
        navigate(`/leads/${lead.id}`);
      },
      onError: (error) => {
        toast.error(error.message || 'Erreur lors de la creation du lead');
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Nom <span className="text-destructive">*</span>
        </label>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError('');
          }}
          placeholder="Prenom Nom"
        />
        {nameError && (
          <p className="text-sm text-destructive">{nameError}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@exemple.fr"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Telephone</label>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+33..."
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Date de l'evenement</label>
        <Input
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          placeholder="Ex: 15 juin 2026"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Source</label>
        <Select value={source} onValueChange={(val: string | null) => { if (val != null) setSource(val); }}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sourceOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Budget</label>
        <Input
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Message</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message ou notes..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={createLead.isPending}>
          {createLead.isPending ? 'Creation...' : 'Creer le lead'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/pipeline')}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
