import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClipsLayout } from '@/components/shared/Layout'
import { useClipsStore } from '@/stores/clipsStore'
import { DashboardPage } from '@/routes/DashboardPage'
import { UploadPage } from '@/routes/UploadPage'
import { SourcesPage } from '@/routes/SourcesPage'
import { SourceDetailPage } from '@/routes/SourceDetailPage'
import { GalleryPage } from '@/routes/GalleryPage'
import { CandidateReviewPage } from '@/routes/CandidateReviewPage'
import { BatchProgressPage } from '@/routes/BatchProgressPage'
import { ClipEditorPage } from '@/routes/ClipEditorPage'
import { ClipPreviewPage } from '@/routes/ClipPreviewPage'
import { ExportQueuePage } from '@/routes/ExportQueuePage'
import { BrandProfilesPage } from '@/routes/BrandProfilesPage'
import BrandProfileEditorPage from '@/routes/BrandProfileEditorPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  const ensureSeeded = useClipsStore((s) => s.ensureSeeded)
  const resumePipelines = useClipsStore((s) => s.resumePipelines)

  useEffect(() => {
    ensureSeeded()
    resumePipelines()
  }, [ensureSeeded, resumePipelines])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/clips" element={<ClipsLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="sources" element={<SourcesPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="sources/:sourceId" element={<SourceDetailPage />} />
            <Route path="sources/:sourceId/candidates" element={<CandidateReviewPage />} />
            <Route path="batches/:batchId" element={<BatchProgressPage />} />
            <Route path="clips/:clipId" element={<ClipEditorPage />} />
            <Route path="clips/:clipId/preview/:platform" element={<ClipPreviewPage />} />
            <Route path="export-queue" element={<ExportQueuePage />} />
            <Route path="settings" element={<BrandProfilesPage />} />
            <Route path="settings/new" element={<BrandProfileEditorPage />} />
            <Route path="settings/:id" element={<BrandProfileEditorPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/clips" replace />} />
          <Route path="*" element={<Navigate to="/clips" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
