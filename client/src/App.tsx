import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

function PipelinePage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Pipeline</h2>
      <p className="text-muted-foreground mt-2">Vue Kanban des leads</p>
    </div>
  );
}

function LeadDetailPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Detail du lead</h2>
    </div>
  );
}

function LeadFormPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Nouveau Lead</h2>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/pipeline" replace />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/leads/new" element={<LeadFormPage />} />
        <Route path="/leads/:id" element={<LeadDetailPage />} />
      </Route>
    </Routes>
  );
}

export default App
