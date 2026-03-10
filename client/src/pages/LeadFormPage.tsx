import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LeadForm } from '@/components/leads/LeadForm';

export function LeadFormPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/pipeline"
          className="rounded-md p-1 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Nouveau lead</h1>
      </div>

      <LeadForm />
    </div>
  );
}
