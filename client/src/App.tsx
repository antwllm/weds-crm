import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { PipelinePage } from '@/pages/PipelinePage'
import { LeadDetailPage } from '@/pages/LeadDetailPage'
import { LeadFormPage } from '@/pages/LeadFormPage'

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
