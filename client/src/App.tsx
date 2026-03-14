import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { PipelinePage } from '@/pages/PipelinePage'
import { LeadDetailPage } from '@/pages/LeadDetailPage'
import { LeadFormPage } from '@/pages/LeadFormPage'

const InboxPage = lazy(() => import('@/pages/InboxPage'))

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/pipeline" replace />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/leads/new" element={<LeadFormPage />} />
        <Route path="/leads/:id" element={<LeadDetailPage />} />
        <Route path="/inbox" element={<Suspense fallback={<div className="p-8 text-muted-foreground">Chargement...</div>}><InboxPage /></Suspense>} />
      </Route>
    </Routes>
  );
}

export default App
